package payments

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

func testClient(serverURL string) Paystack {
	return Paystack{url: serverURL, secretKey: "sk_test_dummy"}
}

func accountWithRecipient() *domain.BusinessBankAccountDetail {
	return &domain.BusinessBankAccountDetail{
		AccountName:           "Test Seller",
		AccountNumber:         "0123456789",
		BankCode:              "058",
		PaystackRecipientCode: "RCP_test",
	}
}

// The classification table. Every row that is NOT a definitive rejection must
// come back ambiguous, because ambiguous is what holds the seller's reservation.
//
// Getting any of these wrong in the releasing direction returns the funds to
// `available` while a real transfer may be in flight at Paystack — and the
// seller can then withdraw the same money a second time.
func TestClassify_AmbiguousOutcomesNeverLookLikeRejection(t *testing.T) {
	cases := []struct {
		name       string
		httpStatus int
		body       string
		callErr    error
		want       TransferOutcome
	}{
		{"transport timeout", 0, "", errors.New("context deadline exceeded"), TransferAmbiguous},
		{"connection reset", 0, "", errors.New("connection reset by peer"), TransferAmbiguous},
		{"dns failure", 0, "", errors.New("no such host"), TransferAmbiguous},
		{"500", 500, `{"status":false,"message":"server error"}`, nil, TransferAmbiguous},
		{"502", 502, "<html>bad gateway</html>", nil, TransferAmbiguous},
		{"503", 503, "", nil, TransferAmbiguous},
		{"unparseable 200", 200, "not json at all", nil, TransferAmbiguous},
		{"empty 200", 200, "", nil, TransferAmbiguous},
		{"unknown status string", 200, `{"status":true,"data":{"status":"queued","transfer_code":"TRF_1"}}`, nil, TransferAmbiguous},
		{"unparseable 400", 400, "<html>denied</html>", nil, TransferAmbiguous},

		// The only two shapes that release funds.
		{"4xx with reason", 400, `{"status":false,"message":"Insufficient balance"}`, nil, TransferDefinitivelyRejected},
		{"200 with status false", 200, `{"status":false,"message":"Transfer declined"}`, nil, TransferDefinitivelyRejected},

		{"accepted pending", 200, `{"status":true,"data":{"status":"pending","transfer_code":"TRF_2","fee":1000}}`, nil, TransferAccepted},
		{"accepted otp", 200, `{"status":true,"data":{"status":"otp","transfer_code":"TRF_3"}}`, nil, TransferAccepted},
		{"accepted success", 200, `{"status":true,"data":{"status":"success","transfer_code":"TRF_4"}}`, nil, TransferAccepted},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := classifyTransferResponse(c.httpStatus, []byte(c.body), c.callErr, "REF_1")
			if got.Outcome != c.want {
				t.Fatalf("outcome = %s, want %s (reason: %q)", got.Outcome, c.want, got.Reason)
			}
			if got.Outcome == TransferAmbiguous && got.Reason == "" {
				t.Error("an ambiguous outcome must carry a reason an operator can read")
			}
		})
	}
}

// An unparseable 4xx is the subtle one. It LOOKS like a rejection, but we could
// not read the body — so we do not actually know Paystack refused, and the
// request may have been actioned.
func TestClassify_UnparseableRejectionIsAmbiguous(t *testing.T) {
	got := classifyTransferResponse(400, []byte("<html>gateway denied</html>"), nil, "REF_X")
	if got.Outcome != TransferAmbiguous {
		t.Fatalf("outcome = %s, want ambiguous: a 4xx we cannot read is not a verdict", got.Outcome)
	}
}

// The fee is captured so the platform cost is visible; it is in kobo on the wire.
func TestClassify_CapturesTransferCodeAndFee(t *testing.T) {
	got := classifyTransferResponse(200,
		[]byte(`{"status":true,"data":{"status":"pending","transfer_code":"TRF_9","reference":"REF_SERVER","fee":1050}}`),
		nil, "REF_LOCAL")
	if got.TransferCode != "TRF_9" {
		t.Errorf("TransferCode = %q, want TRF_9 — without it no webhook can be matched back", got.TransferCode)
	}
	if got.Fee != 10.50 {
		t.Errorf("Fee = %v, want 10.50 (1050 kobo)", got.Fee)
	}
	if got.Status != domain.PaystackTransferPending {
		t.Errorf("Status = %q, want pending", got.Status)
	}
}

// Without a reference Paystack cannot deduplicate, so a retry would create a
// second real transfer. Refusing to send is the only safe answer.
func TestInitiateTransfer_RefusesWithoutAReference(t *testing.T) {
	var called bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))
	defer srv.Close()

	res := testClient(srv.URL).InitiateTransfer(InitiateTransferInput{
		Account: accountWithRecipient(), Amount: 100, Reason: "payout",
	})
	if called {
		t.Fatal("a transfer was sent without a reference; a retry would duplicate it")
	}
	if res.Outcome != TransferDefinitivelyRejected {
		t.Errorf("outcome = %s, want definitive rejection", res.Outcome)
	}
}

// The amount must cross as rounded kobo, and the reference must be on the wire.
func TestInitiateTransfer_SendsRoundedKoboAndTheReference(t *testing.T) {
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = decodeJSON(r, &got)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":true,"data":{"status":"pending","transfer_code":"TRF_K"}}`))
	}))
	defer srv.Close()

	amounts := []float64{8.29} // runtime value: the constant would be folded exactly
	res := testClient(srv.URL).InitiateTransfer(InitiateTransferInput{
		Account: accountWithRecipient(), Amount: amounts[0], Reason: "payout", Reference: "REF_KOBO",
	})
	if res.Outcome != TransferAccepted {
		t.Fatalf("outcome = %s, want accepted", res.Outcome)
	}
	if n, _ := got["amount"].(float64); int64(n) != 829 {
		t.Errorf("amount sent = %v kobo, want 829 — truncation loses a kobo per payout", got["amount"])
	}
	if got["reference"] != "REF_KOBO" {
		t.Errorf("reference sent = %v, want REF_KOBO", got["reference"])
	}
}

// A 404 from verify is a real answer: the transfer was never created, so it is
// safe to re-initiate with the same reference.
func TestVerifyTransfer_NotFoundMeansNeverCreated(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"status":false,"message":"Transfer not found"}`))
	}))
	defer srv.Close()

	res := testClient(srv.URL).VerifyTransfer("REF_MISSING")
	if res.Outcome != TransferNotFound {
		t.Fatalf("outcome = %s, want not_found — distinct from a rejection, because "+
			"a payout that was never created can be safely re-initiated with the "+
			"same reference whereas a rejected one must not be", res.Outcome)
	}
}

// A transport failure during verification leaves us exactly as uncertain as
// before, so it must not resolve anything.
func TestVerifyTransfer_TransportFailureStaysAmbiguous(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	srv.Close() // refuse connections

	res := testClient(srv.URL).VerifyTransfer("REF_A")
	if res.Outcome != TransferAmbiguous {
		t.Fatalf("outcome = %s, want ambiguous", res.Outcome)
	}
}

// An account with no recipient cannot be paid, and that is a setup problem
// rather than a payment failure — definitive, so the funds go back.
func TestInitiateTransfer_NoRecipientIsDefinitive(t *testing.T) {
	res := testClient("http://127.0.0.1:1").InitiateTransfer(InitiateTransferInput{
		Account:   &domain.BusinessBankAccountDetail{AccountName: "No Recipient"},
		Amount:    100,
		Reference: "REF_NR",
	})
	if res.Outcome != TransferDefinitivelyRejected {
		t.Fatalf("outcome = %s, want definitive rejection", res.Outcome)
	}
}

// Codes cached in the jsonb blob by the orphaned implementation must still be
// found, or a second recipient would be created for the same bank account.
func TestExistingRecipientCode_FallsBackToLegacyMetadata(t *testing.T) {
	legacy := &domain.BusinessBankAccountDetail{
		Metadata: domain.MapArray{{"paystack_transfer_recipient_code": "RCP_legacy"}},
	}
	if got := existingRecipientCode(legacy); got != "RCP_legacy" {
		t.Errorf("got %q, want RCP_legacy from the legacy metadata key", got)
	}

	both := &domain.BusinessBankAccountDetail{
		PaystackRecipientCode: "RCP_column",
		Metadata:              domain.MapArray{{"paystack_transfer_recipient_code": "RCP_legacy"}},
	}
	if got := existingRecipientCode(both); got != "RCP_column" {
		t.Errorf("got %q, want the typed column to win", got)
	}
}

func decodeJSON(r *http.Request, out any) error {
	return json.NewDecoder(r.Body).Decode(out)
}

// ── Bank codes are strings (finding 3) ───────────────────────────────────
//
// Measured against Paystack, not inferred: POST /transferrecipient with
// bank_code "44" is refused with "Bank is invalid"; the same request with
// "044" returns 201 and a recipient code. 52 of 284 NGN bank codes begin with
// a zero — Access 044, First Bank 011, UBA 033, Zenith 057, GTBank 058 — and
// 10 are not numeric at all (035A, MFB50094, FC40163, D53).
//
// While `BankCode` was an `int` and this call formatted it with %d, sellers at
// most of Nigeria's largest banks could not be paid, and it surfaced to them as
// "check your bank details".
func TestEnsureTransferRecipient_SendsTheBankCodeVerbatim(t *testing.T) {
	codes := []string{"044", "011", "033", "057", "058", "09", "50211", "035A", "MFB50094", "D53"}

	for _, code := range codes {
		t.Run(code, func(t *testing.T) {
			var got map[string]any
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_ = decodeJSON(r, &got)
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"status":true,"data":{"recipient_code":"RCP_x"}}`))
			}))
			defer srv.Close()

			account := &domain.BusinessBankAccountDetail{
				Bank: "Test Bank", AccountNumber: "0123456789",
				AccountName: "Test Seller", BankCode: code,
			}
			if _, err := testClient(srv.URL).EnsureTransferRecipient(account); err != nil {
				t.Fatalf("ensure recipient: %v", err)
			}
			if got["bank_code"] != code {
				t.Errorf("bank_code sent = %#v, want %q — Paystack refuses a code whose "+
					"leading characters were dropped with \"Bank is invalid\"", got["bank_code"], code)
			}
		})
	}
}

// ── The fee field Paystack actually sends (finding 5) ────────────────────
//
// Verified against a real transfer object: its keys include `fee_charged` and
// `fees_breakdown`, and there is no `fee` key at all. Decoding `fee` recorded
// every transfer fee as zero, silently.
func TestTransferFee_ReadsFeeCharged(t *testing.T) {
	cases := []struct {
		name string
		body string
		want float64
	}{
		{"fee_charged, as Paystack sends it", `{"status":true,"data":{"status":"success","fee_charged":1050}}`, 10.50},
		{"legacy fee, as a fallback", `{"status":true,"data":{"status":"success","fee":2575}}`, 25.75},
		{"fee_charged wins when both appear", `{"status":true,"data":{"status":"success","fee_charged":1050,"fee":9999}}`, 10.50},
		{"absent means zero", `{"status":true,"data":{"status":"success"}}`, 0},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(c.body))
			}))
			defer srv.Close()

			res := testClient(srv.URL).VerifyTransfer("REF_FEE")
			if res.Fee != c.want {
				t.Errorf("Fee = %v, want %v", res.Fee, c.want)
			}
		})
	}
}

// ── "That reference is already on a transfer" (finding 2) ────────────────
//
// Measured message: HTTP 400, status:false, "Please provide a unique reference.
// Reference already exists on a transfer". That is byte-for-byte the shape of a
// definitive rejection, and reading it as one releases the seller's reservation
// against a transfer that EXISTS — so they can withdraw the same money twice.
func TestClassify_DuplicateReferenceIsNotARejection(t *testing.T) {
	duplicates := []string{
		"Please provide a unique reference. Reference already exists on a transfer",
		"Reference already exists on a transfer",
		"Transfer reference has already been used",
		"Duplicate transfer reference",
	}
	for _, msg := range duplicates {
		body := []byte(`{"status":false,"message":"` + msg + `"}`)
		res := classifyTransferResponse(http.StatusBadRequest, body, nil, "REF_DUP")
		if res.Outcome != TransferAlreadyExists {
			t.Errorf("%q classified as %s, want already_exists — as a rejection this "+
				"releases funds against a live transfer", msg, res.Outcome)
		}
	}

	// And unrelated refusals stay definitive, or nothing would ever fail.
	for _, msg := range []string{
		"Bank is invalid",
		"Insufficient balance",
		"Cannot resolve account",
		"Your balance is not enough to fulfil this request",
		"Invalid recipient",
	} {
		body := []byte(`{"status":false,"message":"` + msg + `"}`)
		res := classifyTransferResponse(http.StatusBadRequest, body, nil, "REF_REJ")
		if res.Outcome != TransferDefinitivelyRejected {
			t.Errorf("%q classified as %s, want definitively_rejected", msg, res.Outcome)
		}
	}
}

// ── The reference format (finding 1) ────────────────────────────────────
//
// Reported as a P0 on the basis that Paystack permits only lowercase. It does
// not: probed against the live API, `VBR-PO-ABCDEF0123456789AB` was ACCEPTED
// (HTTP 200, transfer created), stored with its case intact, and
// GET /transfer/verify/VBR-PO-ABCDEF0123456789AB retrieved it.
//
// Case preservation is the part worth pinning. If Paystack lowercased a
// reference on storage, verifying by the string we saved would 404, the
// reconciler would read that as "never created", re-send, and be refused for a
// duplicate — so this test guards the assumption the recovery path rests on.
func TestReferenceFormat_IsSafeForPaystack(t *testing.T) {
	var got map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = decodeJSON(r, &got)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":true,"data":{"status":"pending","transfer_code":"TRF_F","reference":"VBR-PO-ABC123"}}`))
	}))
	defer srv.Close()

	const ref = "VBR-PO-ABC123"
	res := testClient(srv.URL).InitiateTransfer(InitiateTransferInput{
		Account: accountWithRecipient(), Amount: 100, Reason: "payout", Reference: ref,
	})
	if got["reference"] != ref {
		t.Errorf("reference was altered before sending: %#v, want %q", got["reference"], ref)
	}
	// Paystack echoes the reference back; we must keep ITS spelling, because
	// that is the key the transfer is stored under.
	if res.Reference != ref {
		t.Errorf("Reference = %q, want %q — the stored key must match what we verify by", res.Reference, ref)
	}
}
