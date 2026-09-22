package shipping

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// serviceAgainst points a ShipbubbleService at a test server.
func serviceAgainst(t *testing.T, handler http.HandlerFunc) (*ShipbubbleService, *[]*http.Request) {
	t.Helper()
	var seen []*http.Request
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.Clone(r.Context()))
		handler(w, r)
	}))
	t.Cleanup(srv.Close)
	return &ShipbubbleService{apiKey: "sb_sandbox_test", baseURL: srv.URL}, &seen
}

func asAPIError(t *testing.T, err error) *APIError {
	t.Helper()
	if err == nil {
		t.Fatal("expected an error, got nil")
	}
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("error is %T, not *APIError: %v", err, err)
	}
	return apiErr
}

// THE regression. `app.shipbubble.com` answers API paths with an HTML 404
// document. The old client only looked at the status code and reported
// "API returned status: 404", which reads as "Shipbubble rejected this
// address" — so a wrong base URL presented as a product failure, and did for
// as long as staging was misconfigured.
func TestHTMLResponse_IsClassifiedAsAConfigurationFault(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>` +
			`<title>404: This page could not be found</title></head><body>Not found</body></html>`))
	})

	_, err := svc.ValidateAddress(ShipbubbleAddressInfo{
		Name: "Ada Obi", Email: "ada@example.com",
		Phone: "+2348000000001", Address: "12 Awolowo Road, Ikoyi, Lagos, Nigeria",
	})
	apiErr := asAPIError(t, err)

	if apiErr.Kind != KindNonJSONResponse {
		t.Errorf("Kind = %q, want %q — an HTML page is a wrong-host symptom, not a "+
			"rejected address", apiErr.Kind, KindNonJSONResponse)
	}
	if apiErr.Status != http.StatusNotFound {
		t.Errorf("Status = %d, want 404", apiErr.Status)
	}
	if apiErr.ContentType != "text/html" {
		t.Errorf("ContentType = %q, want %q (parameters stripped)", apiErr.ContentType, "text/html")
	}

	msg := apiErr.Error()
	// The message has to point at the fix. "API returned status: 404" did not.
	if !strings.Contains(msg, EnvBaseURL) || !strings.Contains(msg, DefaultBaseURL) {
		t.Errorf("error does not name the variable and the correct base: %q", msg)
	}
	// And it must not carry the document.
	for _, leak := range []string{"<!DOCTYPE", "<html", "could not be found", "Not found</body>"} {
		if strings.Contains(msg, leak) {
			t.Errorf("error leaks the response body (%q): %q", leak, msg)
		}
	}
	// Nor the address that was being validated.
	for _, pii := range []string{"Ada Obi", "ada@example.com", "+2348000000001", "Awolowo"} {
		if strings.Contains(msg, pii) {
			t.Errorf("error leaks customer data (%q): %q", pii, msg)
		}
	}
}

// A 200 that is not JSON is equally a wrong-host symptom — and the old
// FetchShippingRates path was worse here than the 404 case: it ignored the
// status entirely and unmarshalled whatever came back, so an HTML page decoded
// to an empty courier list and the seller simply appeared to have no delivery
// option.
func TestNonJSONSuccess_IsStillAnError(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<html><body>dashboard</body></html>"))
	})

	_, err := svc.FetchShippingRates(FetchRatesRequest{SenderAddressCode: 1, ReceiverAddressCode: 2})
	apiErr := asAPIError(t, err)
	if apiErr.Kind != KindNonJSONResponse {
		t.Errorf("Kind = %q, want %q — a 200 HTML page must not decode to zero couriers",
			apiErr.Kind, KindNonJSONResponse)
	}
}

// A response with no Content-Type at all must not be assumed to be JSON.
func TestMissingContentType_IsNotAssumedJSON(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h["Content-Type"] = nil
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success"}`))
	})
	_, err := svc.ValidateAddress(ShipbubbleAddressInfo{})
	apiErr := asAPIError(t, err)
	if apiErr.Kind != KindNonJSONResponse {
		t.Errorf("Kind = %q, want %q", apiErr.Kind, KindNonJSONResponse)
	}
}

// Shipbubble's structured error is CLASSIFIED, and none of it is retained.
//
// An earlier version kept the provider's `message` on the error and logged it,
// on the reasoning that it is the only part that says what to fix. It is also
// the part that echoes the submitted address and phone straight back, so
// keeping it put customer data one `%v` away from a log line — and bounding its
// length shortened the PII rather than removing it. There is no field to leak
// now, which is the only version of this that survives the next refactor.
func TestJSONError_IsClassifiedAndRetainsNothing(t *testing.T) {
	cases := []struct {
		status   int
		wantKind ErrorKind
	}{
		{http.StatusUnauthorized, KindUnauthorized},
		{http.StatusForbidden, KindUnauthorized},
		{http.StatusNotFound, KindNotFound},
		{http.StatusTooManyRequests, KindRateLimited},
		{http.StatusBadRequest, KindProviderError},
		{http.StatusInternalServerError, KindProviderError},
	}

	// A provider message of exactly the kind Shipbubble sends: the submitted
	// address and phone, echoed back inside the diagnostic.
	const providerBody = `{"status":"error",` +
		`"message":"receiver address 12 Awolowo Road, Ikoyi, Lagos is invalid for +2348000000001 (Ada Obi)",` +
		`"data":{"phone":"+2348000000001","address":"12 Awolowo Road, Ikoyi"}}`

	leaks := []string{
		"12 Awolowo Road", "Awolowo", "Ikoyi", "Lagos",
		"+2348000000001", "Ada Obi", "receiver address", `"data"`,
	}

	for _, c := range cases {
		t.Run(http.StatusText(c.status), func(t *testing.T) {
			svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Request-Id", "req_abc123")
				w.WriteHeader(c.status)
				_, _ = w.Write([]byte(providerBody))
			})

			_, err := svc.ValidateAddress(ShipbubbleAddressInfo{Phone: "+2348000000001"})
			apiErr := asAPIError(t, err)

			if apiErr.Kind != c.wantKind {
				t.Errorf("Kind = %q, want %q", apiErr.Kind, c.wantKind)
			}
			if apiErr.Status != c.status {
				t.Errorf("Status = %d, want %d", apiErr.Status, c.status)
			}
			if !apiErr.Structured {
				t.Error("Structured = false — a recognisable Shipbubble error envelope " +
					"was not classified as one")
			}
			if apiErr.RequestID != "req_abc123" {
				t.Errorf("RequestID = %q, want req_abc123 — it is how support finds the call",
					apiErr.RequestID)
			}

			// The error string is what a caller's `%v` prints, so it is the
			// leak path that matters most.
			rendered := apiErr.Error()
			for _, leak := range leaks {
				if strings.Contains(rendered, leak) {
					t.Errorf("err.Error() leaks %q: %q", leak, rendered)
				}
			}
			if formatted := fmt.Sprintf("%v", err); strings.Contains(formatted, "Awolowo") {
				t.Errorf("%%v of the error leaks the address: %q", formatted)
			}
		})
	}
}

// An unstructured non-2xx body is classified as such, so "the provider
// rejected this" stays distinguishable from "something else answered".
func TestJSONError_UnstructuredBodyIsNotMarkedStructured(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"nonsense":true}`))
	})
	_, err := svc.ValidateAddress(ShipbubbleAddressInfo{})
	if apiErr := asAPIError(t, err); apiErr.Structured {
		t.Error("Structured = true for a body with no status or message field")
	}
}

// A body must not reach the error by ANY route, including a provider message so
// long that the old code truncated it. There is nothing to truncate now.
func TestProviderMessage_IsNotRetainedAtAnyLength(t *testing.T) {
	long := strings.Repeat("padding ", 80)
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"status":"error","message":"12 Awolowo Road ` + long + `"}`))
	})
	_, err := svc.ValidateAddress(ShipbubbleAddressInfo{})
	apiErr := asAPIError(t, err)

	rendered := apiErr.Error()
	for _, leak := range []string{"Awolowo", "padding"} {
		if strings.Contains(rendered, leak) {
			t.Errorf("err.Error() leaks %q from the provider message: %q", leak, rendered)
		}
	}
	// A 200-char cap would have kept the first 200 characters, which begin with
	// the address.
	if len(rendered) > 300 {
		t.Errorf("error string is %d chars — something from the body is riding along: %q",
			len(rendered), rendered)
	}
}

// Declared JSON that will not decode is its own classification, distinct from
// "not JSON at all" — the first is a provider contract change, the second is a
// wrong host, and they need different fixes.
func TestMalformedJSON_IsDistinctFromNonJSON(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success","data":"not-an-object"}`))
	})
	_, err := svc.ValidateAddress(ShipbubbleAddressInfo{})
	apiErr := asAPIError(t, err)
	if apiErr.Kind != KindMalformedJSON {
		t.Errorf("Kind = %q, want %q", apiErr.Kind, KindMalformedJSON)
	}
}

// The happy path, so every assertion above is a rejection of something specific
// rather than of everything.
func TestSuccess_DecodesAndSendsTheExpectedRequest(t *testing.T) {
	svc, seen := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success","message":"ok","data":{"address_code":98765}}`))
	})

	data, err := svc.ValidateAddress(ShipbubbleAddressInfo{Name: "Ada Obi"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data.AddressCode != 98765 {
		t.Errorf("AddressCode = %d, want 98765", data.AddressCode)
	}

	if len(*seen) != 1 {
		t.Fatalf("made %d requests, want 1", len(*seen))
	}
	req := (*seen)[0]
	if req.URL.Path != "/shipping/address/validate" {
		t.Errorf("path = %q, want /shipping/address/validate", req.URL.Path)
	}
	if got := req.Header.Get("Authorization"); got != "Bearer sb_sandbox_test" {
		t.Errorf("Authorization = %q", got)
	}
	if got := req.Header.Get("Accept"); got != "application/json" {
		t.Errorf("Accept = %q, want application/json — asking for JSON is what makes a "+
			"non-JSON answer unambiguous", got)
	}
}

// Zero couriers is a legitimate answer (an unserviced route), not an error: the
// caller degrades to the seller's own delivery. What must NOT happen is the old
// behaviour of dumping the request payload and the full response on that branch.
func TestZeroCouriers_IsNotAnError(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success","message":"no couriers","data":{"couriers":[]}}`))
	})

	resp, err := svc.FetchShippingRates(FetchRatesRequest{SenderAddressCode: 1})
	if err != nil {
		t.Fatalf("a zero-courier response must not be an error: %v", err)
	}
	if len(resp.Data.Couriers) != 0 {
		t.Errorf("got %d couriers, want 0", len(resp.Data.Couriers))
	}
}

// A transport failure (no server) is classified, and the error does not carry
// the request payload.
func TestTransportFailure_IsClassified(t *testing.T) {
	svc := &ShipbubbleService{apiKey: "sb_sandbox_test", baseURL: "https://127.0.0.1:1"}
	_, err := svc.CreateShipment(CreateShipmentRequest{RequestToken: "tok_secret"})
	apiErr := asAPIError(t, err)
	if apiErr.Kind != KindTransport {
		t.Errorf("Kind = %q, want %q", apiErr.Kind, KindTransport)
	}
	if strings.Contains(apiErr.Error(), "tok_secret") {
		t.Errorf("error leaks the request payload: %q", apiErr.Error())
	}
}

// Every operation goes through the same handling, so a new call site cannot
// reintroduce per-endpoint status logic.
func TestAllOperations_ShareTheSameErrorHandling(t *testing.T) {
	svc, _ := serviceAgainst(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte("<html>404</html>"))
	})

	calls := map[string]func() error{
		"validate_address": func() error { _, e := svc.ValidateAddress(ShipbubbleAddressInfo{}); return e },
		"fetch_rates":      func() error { _, e := svc.FetchShippingRates(FetchRatesRequest{}); return e },
		"create_shipment":  func() error { _, e := svc.CreateShipment(CreateShipmentRequest{}); return e },
	}
	for operation, call := range calls {
		t.Run(operation, func(t *testing.T) {
			apiErr := asAPIError(t, call())
			if apiErr.Kind != KindNonJSONResponse {
				t.Errorf("Kind = %q, want %q", apiErr.Kind, KindNonJSONResponse)
			}
			if apiErr.Operation != operation {
				t.Errorf("Operation = %q, want %q", apiErr.Operation, operation)
			}
		})
	}
}
