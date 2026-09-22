package shipping

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
)

// One place that turns an HTTP exchange with Shipbubble into either a decoded
// payload or a SANITIZED error.
//
// Each of the three call sites used to do this itself, and they did it
// differently: ValidateAddress checked `StatusCode != 200` and reported
// "API returned status: 404"; FetchShippingRates ignored the status entirely and
// unmarshalled whatever came back, so an HTML error page produced an empty
// courier list rather than an error; CreateShipment did the same. The result was
// that one misconfiguration presented as three unrelated symptoms — a rejected
// address, a seller with no delivery options, and a shipment that silently
// failed to book.
//
// Nothing here logs a request body, a response body, or any field of either.
// The provider's own `message` is the single piece of response content that
// travels, because it is the only part that tells an operator what to fix, and
// Shipbubble puts validation text there rather than customer data.

// maxErrorBody caps what is read from a failing response. An HTML error page
// can be megabytes, and none of it is needed to classify the failure.
const maxErrorBody = 8 << 10

// ErrorKind is the sanitized classification of a Shipbubble failure. It is
// deliberately coarse: enough to decide whether to retry, degrade, or fix
// configuration, and carrying no request detail.
type ErrorKind string

const (
	// KindTransport — the request never completed (DNS, TLS, timeout).
	KindTransport ErrorKind = "transport"
	// KindUnauthorized — 401/403. Wrong or missing key for this environment.
	KindUnauthorized ErrorKind = "unauthorized"
	// KindNotFound — 404 with a JSON body. The resource, not the host.
	KindNotFound ErrorKind = "not_found"
	// KindRateLimited — 429.
	KindRateLimited ErrorKind = "rate_limited"
	// KindProviderError — any other non-2xx with a parseable JSON body.
	KindProviderError ErrorKind = "provider_error"
	// KindNonJSONResponse — the response was not JSON at all, typically an HTML
	// page. Almost always a wrong base URL rather than a provider fault, so it
	// is classified separately and says so.
	KindNonJSONResponse ErrorKind = "non_json_response"
	// KindMalformedJSON — declared JSON that would not decode.
	KindMalformedJSON ErrorKind = "malformed_json"
)

// APIError is what every Shipbubble call returns on failure.
type APIError struct {
	Operation string
	Status    int
	Kind      ErrorKind
	// Structured reports whether the body was a recognisable Shipbubble error
	// envelope. A BOOLEAN, deliberately, not the message.
	//
	// The message itself is not kept anywhere. Shipbubble echoes submitted
	// values back in it — "receiver address 12 Awolowo Road, Ikoyi is invalid",
	// with the phone alongside — so retaining it puts customer data one `%v`
	// away from a log line, and bounding its length shortens PII rather than
	// removing it. There is no field here to leak, which is the only version of
	// this that stays true after the next refactor.
	Structured bool
	// RequestID is the provider's correlation id when it sends one.
	RequestID string
	// ContentType is the declared media type, for the non-JSON case.
	ContentType string
	// Err is the underlying transport error, if any.
	Err error
}

func (e *APIError) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "shipbubble %s: %s", e.Operation, e.Kind)
	if e.Status != 0 {
		fmt.Fprintf(&b, " (status %d)", e.Status)
	}
	if e.Kind == KindNonJSONResponse {
		fmt.Fprintf(&b, ": response was %q, not JSON — check %s (expected %s)",
			e.ContentType, EnvBaseURL, DefaultBaseURL)
	}
	if e.RequestID != "" {
		fmt.Fprintf(&b, " [request %s]", e.RequestID)
	}
	if e.Err != nil {
		fmt.Fprintf(&b, ": %v", e.Err)
	}
	return b.String()
}

func (e *APIError) Unwrap() error { return e.Err }

// providerEnvelope is the shape Shipbubble wraps every response in. It is
// decoded ONLY to establish whether a failure came back as a structured
// Shipbubble error at all — which distinguishes "the provider rejected this"
// from "something else answered" — and the decoded values are then discarded.
//
// The fields are present because the decoder needs them to match; nothing reads
// them beyond the presence check in structuredError.
type providerEnvelope struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// structuredError reports whether the body is a recognisable Shipbubble error
// envelope, without retaining any of it.
func structuredError(raw []byte) bool {
	var env providerEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		return false
	}
	return env.Status != "" || env.Message != ""
}

// do performs one Shipbubble call and decodes a successful response into out.
//
// `operation` is a stable, non-identifying label ("validate_address") used for
// logging and error text. `path` is joined to the configured base URL.
func (s *ShipbubbleService) do(operation, method, path string, payload any, out any) error {
	endpoint := s.baseURL + path

	var body io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			// The payload is customer data; report that encoding failed, never what.
			return &APIError{Operation: operation, Kind: KindTransport,
				Err: fmt.Errorf("could not encode the request")}
		}
		body = bytes.NewReader(encoded)
	}

	req, err := http.NewRequest(method, endpoint, body)
	if err != nil {
		return &APIError{Operation: operation, Kind: KindTransport, Err: err}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	start := time.Now()
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		// url.Error embeds the full URL but not the payload; the URL is our own
		// configuration, so it is safe and useful.
		apiErr := &APIError{Operation: operation, Kind: KindTransport, Err: err}
		logFailure(operation, apiErr, time.Since(start))
		return apiErr
	}
	defer resp.Body.Close()

	requestID := providerRequestID(resp)
	mediaType := declaredMediaType(resp)

	// Content type BEFORE status, because a non-JSON body means the status is
	// not Shipbubble's to begin with — it is whatever host answered. This is the
	// check that turns a wrong base URL into a legible error.
	if mediaType != "application/json" {
		// Drain a bounded amount so the connection can be reused; the bytes are
		// deliberately discarded rather than logged.
		_, _ = io.CopyN(io.Discard, resp.Body, maxErrorBody)
		apiErr := &APIError{Operation: operation, Status: resp.StatusCode,
			Kind: KindNonJSONResponse, ContentType: mediaType, RequestID: requestID}
		logFailure(operation, apiErr, time.Since(start))
		return apiErr
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBody))
	if err != nil {
		apiErr := &APIError{Operation: operation, Status: resp.StatusCode,
			Kind: KindTransport, RequestID: requestID, Err: fmt.Errorf("could not read the response")}
		logFailure(operation, apiErr, time.Since(start))
		return apiErr
	}

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		apiErr := &APIError{Operation: operation, Status: resp.StatusCode,
			Kind: kindForStatus(resp.StatusCode), Structured: structuredError(raw),
			RequestID: requestID}
		logFailure(operation, apiErr, time.Since(start))
		return apiErr
	}

	if out != nil {
		if err := json.Unmarshal(raw, out); err != nil {
			apiErr := &APIError{Operation: operation, Status: resp.StatusCode,
				Kind: KindMalformedJSON, RequestID: requestID,
				Err: fmt.Errorf("response did not match the expected shape")}
			logFailure(operation, apiErr, time.Since(start))
			return apiErr
		}
	}

	logger.Info(fmt.Sprintf("shipbubble %s ok status=%d duration_ms=%d%s",
		operation, resp.StatusCode, time.Since(start).Milliseconds(), requestSuffix(requestID)))
	return nil
}

// maxResponseBody caps a SUCCESSFUL response too. A rate list is a few KB; a
// megabyte would mean something is wrong.
const maxResponseBody = 2 << 20

func kindForStatus(status int) ErrorKind {
	switch {
	case status == http.StatusUnauthorized, status == http.StatusForbidden:
		return KindUnauthorized
	case status == http.StatusNotFound:
		return KindNotFound
	case status == http.StatusTooManyRequests:
		return KindRateLimited
	default:
		return KindProviderError
	}
}

// declaredMediaType returns the response's media type, lowercased and without
// parameters. An absent Content-Type is reported as "" so it fails the JSON
// check rather than being assumed JSON.
func declaredMediaType(resp *http.Response) string {
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		return ""
	}
	mediaType, _, err := mime.ParseMediaType(ct)
	if err != nil {
		return strings.ToLower(strings.TrimSpace(strings.Split(ct, ";")[0]))
	}
	return strings.ToLower(mediaType)
}

// providerRequestID reads whichever correlation header the provider or its edge
// sends. Worth having: it is the one value that lets Shipbubble support find the
// call, and it identifies the REQUEST rather than the customer.
func providerRequestID(resp *http.Response) string {
	for _, h := range []string{"X-Request-Id", "X-Request-ID", "Request-Id", "X-Correlation-Id", "Cf-Ray"} {
		if v := strings.TrimSpace(resp.Header.Get(h)); v != "" {
			return v
		}
	}
	return ""
}

func requestSuffix(requestID string) string {
	if requestID == "" {
		return ""
	}
	return " request=" + requestID
}

// logFailure emits exactly five things: the operation, the classification, the
// HTTP status, the duration and the provider request id.
//
// No URL beyond the operation name, no headers, no request body, no response
// body, and NO provider message. The content type is included for the non-JSON
// case because it is a media type, not content, and it is the one value that
// tells an operator the base URL is wrong.
func logFailure(operation string, e *APIError, took time.Duration) {
	msg := fmt.Sprintf("shipbubble %s failed kind=%s status=%d duration_ms=%d structured=%t%s",
		operation, e.Kind, e.Status, took.Milliseconds(), e.Structured, requestSuffix(e.RequestID))
	if e.Kind == KindNonJSONResponse {
		msg += fmt.Sprintf(" content_type=%q (expected JSON — check %s)", e.ContentType, EnvBaseURL)
	}
	logger.Error(msg)
}
