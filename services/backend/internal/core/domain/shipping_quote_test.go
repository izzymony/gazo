package domain

import (
	"strings"
	"testing"
	"time"
)

// G12. A shipping option is a PRICE QUOTE, and it used to be an unowned,
// unexpiring, unattached row that checkout accepted on nothing but its id — so
// a quote raised for a heavy product could ship a light one, one raised for
// Lagos could ship to Sokoto, and one raised by a different buyer was equally
// acceptable. No malice required: a stale client cart is enough.

func boundQuote(expires time.Time) *ShippingOption {
	return &ShippingOption{
		UserID:             "buyer-1",
		ProductID:          "prod-1",
		AddressFingerprint: QuoteFingerprint("12 Awolowo Road", "Ikoyi", "Lagos", "Nigeria"),
		ExpiresAt:          &expires,
		Price:              "₦2,500",
	}
}

func TestIsQuoteFor_AcceptsTheQuoteItWasRaisedFor(t *testing.T) {
	now := time.Now()
	q := boundQuote(now.Add(time.Hour))
	fingerprint := QuoteFingerprint("12 Awolowo Road", "Ikoyi", "Lagos", "Nigeria")

	if err := q.IsQuoteFor("buyer-1", "prod-1", fingerprint, now); err != nil {
		t.Fatalf("a valid quote was refused: %v", err)
	}
}

// Each of the four conditions refused SEPARATELY, and with a distinct message:
// "shipping option not found" told the buyer nothing about why their checkout
// failed and told us nothing about which condition it was.
func TestIsQuoteFor_RefusesEachMismatchDistinctly(t *testing.T) {
	now := time.Now()
	here := QuoteFingerprint("12 Awolowo Road", "Ikoyi", "Lagos", "Nigeria")
	elsewhere := QuoteFingerprint("4 Bank Road", "Sokoto", "Sokoto", "Nigeria")

	cases := []struct {
		name        string
		quote       *ShippingOption
		userID      string
		productID   string
		fingerprint string
		now         time.Time
		wantMention string
	}{
		{"another buyer's quote", boundQuote(now.Add(time.Hour)), "buyer-2", "prod-1", here, now, "different account"},
		{"quoted for another product", boundQuote(now.Add(time.Hour)), "buyer-1", "prod-2", here, now, "different product"},
		{"quoted for another address", boundQuote(now.Add(time.Hour)), "buyer-1", "prod-1", elsewhere, now, "different address"},
		{"expired one second ago", boundQuote(now.Add(-time.Second)), "buyer-1", "prod-1", here, now, "expired"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.quote.IsQuoteFor(c.userID, c.productID, c.fingerprint, c.now)
			if err == nil {
				t.Fatalf("accepted a quote for %s", c.name)
			}
			if !strings.Contains(err.Error(), c.wantMention) {
				t.Errorf("error %q does not mention %q — the buyer cannot tell what to fix",
					err, c.wantMention)
			}
		})
	}
}

// The expiry boundary. Valid AT the expiry instant, refused after it.
func TestIsQuoteFor_ExpiryBoundary(t *testing.T) {
	now := time.Now()
	here := QuoteFingerprint("12 Awolowo Road", "Ikoyi", "Lagos", "Nigeria")

	atExpiry := boundQuote(now)
	if err := atExpiry.IsQuoteFor("buyer-1", "prod-1", here, now); err != nil {
		t.Errorf("a quote expiring exactly now was refused: %v", err)
	}

	justExpired := boundQuote(now.Add(-time.Nanosecond))
	if err := justExpired.IsQuoteFor("buyer-1", "prod-1", here, now); err == nil {
		t.Error("a quote that expired one nanosecond ago was accepted")
	}
}

// Rows written before the binding existed get zero values. They are REFUSED,
// not waved through.
//
// A bypass for unbound rows is the silent-hardcoded-fallback trap: it would
// make the check pass for exactly the rows it cannot verify, and nothing would
// ever remove it. These rows are ephemeral per-checkout quotes, so the cost is
// one re-quote.
func TestIsQuoteFor_RefusesUnboundLegacyQuotes(t *testing.T) {
	now := time.Now()
	here := QuoteFingerprint("12 Awolowo Road", "Ikoyi", "Lagos", "Nigeria")

	partial := []*ShippingOption{
		{},
		{UserID: "buyer-1"},
		{UserID: "buyer-1", ProductID: "prod-1"},
		{UserID: "buyer-1", ProductID: "prod-1", AddressFingerprint: here}, // no expiry
	}
	for i, q := range partial {
		if err := q.IsQuoteFor("buyer-1", "prod-1", here, now); err == nil {
			t.Errorf("case %d: an unbound quote was accepted", i)
		}
	}
}

// The fingerprint has to survive the ways the SAME address is spelled in a
// quote request and in a saved shipping profile. A fingerprint that changed
// with the spelling would reject legitimate checkouts, and the pressure would
// then be to delete the check rather than fix the hash.
func TestQuoteFingerprint_NormalisesSpelling(t *testing.T) {
	canonical := QuoteFingerprint("12 Awolowo Road", "Ikoyi", "Lagos", "Nigeria")

	same := [][]string{
		{"12 awolowo road", "ikoyi", "lagos", "nigeria"},
		{"12 Awolowo Road.", "Ikoyi", "Lagos", "Nigeria"},
		{"12  Awolowo   Road", "Ikoyi ", " Lagos", "Nigeria"},
		{"12, Awolowo Road", "Ikoyi", "Lagos", "Nigeria"},
		{"12 AWOLOWO ROAD", "IKOYI", "LAGOS", "NIGERIA"},
	}
	for _, s := range same {
		if got := QuoteFingerprint(s[0], s[1], s[2], s[3]); got != canonical {
			t.Errorf("%v fingerprinted differently from the canonical spelling — a valid "+
				"checkout would be refused", s)
		}
	}

	// And genuinely different addresses must NOT collide, or the check is
	// decorative.
	different := [][]string{
		{"13 Awolowo Road", "Ikoyi", "Lagos", "Nigeria"},
		{"12 Awolowo Road", "Yaba", "Lagos", "Nigeria"},
		{"12 Awolowo Road", "Ikoyi", "Sokoto", "Nigeria"},
		{"12 Awolowo Road", "Ikoyi", "Lagos", "Ghana"},
		{"12 Awolowo Street", "Ikoyi", "Lagos", "Nigeria"},
	}
	for _, d := range different {
		if got := QuoteFingerprint(d[0], d[1], d[2], d[3]); got == canonical {
			t.Errorf("%v fingerprinted the SAME as the canonical address — a quote for one "+
				"would price the other", d)
		}
	}

	// Field boundaries must be REAL, i.e. the parts are joined with a delimiter.
	//
	// Moving a whole word across a boundary happens to survive an undelimited
	// join, because the normalisation preserves internal spaces and the space
	// simply moves with it. What does NOT survive is a boundary shifted
	// mid-word: without a delimiter, town "Ikoy" + state "iLagos" concatenates
	// to exactly the same string as town "Ikoyi" + state "Lagos", so a quote
	// for one would price the other. Mutation testing found this — the
	// whole-word case alone left the delimiter untested.
	shifted := QuoteFingerprint("12 Awolowo Road", "Ikoy", "iLagos", "Nigeria")
	if shifted == canonical {
		t.Error("town+state boundary is not delimited: \"Ikoy\"+\"iLagos\" fingerprints the " +
			"same as \"Ikoyi\"+\"Lagos\", so a quote for one address would price another")
	}
	// And the whole-word move, which should also differ.
	a := QuoteFingerprint("12 Awolowo", "Road Ikoyi", "Lagos", "Nigeria")
	b := QuoteFingerprint("12", "Awolowo Road Ikoyi", "Lagos", "Nigeria")
	if a == b {
		t.Error("moving a word across a field boundary did not change the fingerprint")
	}
}
