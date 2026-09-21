package payments

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// G7. Initiate used to take `int32` NAIRA and send `amount * 100`, which lost
// kobo at every call site and overflowed int32 above ₦21,474,836 — silently,
// into a negative number.
//
// What is asserted is the amount that goes ON THE WIRE, because that is the
// only thing Paystack acts on. A test on the Go value would have passed under
// the broken signature too.
func newCapturingPaystack(t *testing.T, captured *int64) Paystack {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode request: %v", err)
		}
		if amount, ok := body["amount"].(float64); ok {
			*captured = int64(amount)
		} else {
			t.Errorf("amount was not a number: %#v", body["amount"])
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":true,"message":"ok","data":{"reference":"ref","access_code":"ac","authorization_url":"https://x"}}`))
	}))
	t.Cleanup(server.Close)
	return Paystack{url: server.URL, secretKey: "sk_test_x"}
}

func TestInitiate_SendsExactKobo(t *testing.T) {
	cases := []struct {
		name  string
		naira float64
		want  int64
	}{
		{"whole naira", 8450, 845000},
		{"kobo survive", 8450.50, 845050},
		{"the ToKobo rounding case", 8.29, 829},
		{"one kobo", 0.01, 1},
		{
			// int32 overflows at 2,147,483,647 kobo, so ₦21,474,836.48 and up
			// wrapped negative under `int32 * 100`.
			name: "just past the old int32 overflow", naira: 21_474_837, want: 2_147_483_700,
		},
		{"well past it", 50_000_000, 5_000_000_000},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var captured int64
			p := newCapturingPaystack(t, &captured)
			if _, err := p.Initiate("buyer@example.com", "inv-1", helper.ToKobo(c.naira), "https://cb"); err != nil {
				t.Fatalf("Initiate: %v", err)
			}
			if captured != c.want {
				t.Errorf("sent %d kobo for ₦%.2f, want %d", captured, c.naira, c.want)
			}
			if captured < 0 {
				t.Errorf("the amount on the wire is NEGATIVE (%d) — this is the int32 overflow", captured)
			}
		})
	}
}

// The provider safety limit. Independent of CHECKOUT_MAX_NGN by design: this
// one protects the arithmetic and the wire format, and no environment variable
// can switch it off.
func TestInitiate_RefusesAmountsItCannotSafelySend(t *testing.T) {
	// Deliberately set the product bound wide open — the provider limit must
	// still hold.
	t.Setenv("CHECKOUT_MAX_NGN", "999999999999")

	cases := []struct {
		name string
		kobo int64
	}{
		{"zero", 0},
		{"negative", -1},
		{"a negative that looks like an overflow result", -2147483648},
		{"one kobo over the provider limit", maxInitiateKobo + 1},
		{"absurd", 1 << 60},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var captured int64 = -999
			p := newCapturingPaystack(t, &captured)
			if _, err := p.Initiate("buyer@example.com", "inv-1", c.kobo, "https://cb"); err == nil {
				t.Errorf("Initiate accepted %d kobo", c.kobo)
			}
			if captured != -999 {
				t.Errorf("a refused amount still reached the provider (%d kobo)", captured)
			}
		})
	}

	// And the boundary itself is allowed, so the limit is not off by one.
	var captured int64
	p := newCapturingPaystack(t, &captured)
	if _, err := p.Initiate("buyer@example.com", "inv-1", maxInitiateKobo, "https://cb"); err != nil {
		t.Errorf("Initiate refused exactly the provider limit: %v", err)
	}
	if captured != maxInitiateKobo {
		t.Errorf("sent %d kobo at the limit, want %d", captured, maxInitiateKobo)
	}
}

// G21: the collection fee has to survive parsing, and a MISSING fee must not
// read as a genuine zero — which is what `interface{}` and then `int64` would
// both have done.
func TestVerifyResponse_FeeIsOptionalAndTyped(t *testing.T) {
	var withFee VerifyPaystackResponse
	if err := json.Unmarshal([]byte(`{"status":true,"data":{"amount":845050,"fees":12675}}`), &withFee); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if withFee.Data.Fees == nil {
		t.Fatal("a present fee unmarshalled as nil")
	}
	if *withFee.Data.Fees != 12675 {
		t.Errorf("fee = %d kobo, want 12675", *withFee.Data.Fees)
	}

	for _, body := range []string{
		`{"status":true,"data":{"amount":845050}}`,
		`{"status":true,"data":{"amount":845050,"fees":null}}`,
	} {
		var noFee VerifyPaystackResponse
		if err := json.Unmarshal([]byte(body), &noFee); err != nil {
			t.Fatalf("unmarshal %s: %v", body, err)
		}
		if noFee.Data.Fees != nil {
			t.Errorf("%s: an absent fee became %d — it must stay nil so it is not "+
				"recorded as a real zero fee", body, *noFee.Data.Fees)
		}
	}
}
