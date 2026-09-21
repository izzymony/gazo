package helper

import (
	"testing"
	"time"
)

// D1 is a POLICY with a default, not a constant. What these pin is the
// fallback behaviour, because that is the part a bad deploy exercises: a
// missing or fat-fingered variable must resolve to "wait 24 hours", never to
// "release now".
func TestEarningsReleaseDelay_FallsBackTowardsWaiting(t *testing.T) {
	cases := []struct {
		name string
		set  bool
		raw  string
		want time.Duration
	}{
		{"unset uses the launch default", false, "", 24 * time.Hour},
		{"empty string is not zero", true, "", 24 * time.Hour},
		{"whitespace is not zero", true, "   ", 24 * time.Hour},
		{"garbage falls back rather than releasing instantly", true, "soon", 24 * time.Hour},
		{"negative falls back — it would release everything ever delivered", true, "-5", 24 * time.Hour},
		{"an explicit 0 IS honoured, for local testing", true, "0", 0},
		{"a shorter window", true, "2", 2 * time.Hour},
		{"a longer window", true, "72", 72 * time.Hour},
		{"fractional hours, for a short staging window", true, "0.5", 30 * time.Minute},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if c.set {
				t.Setenv("EARNINGS_RELEASE_DELAY_HOURS", c.raw)
			}
			if got := EarningsReleaseDelay(); got != c.want {
				t.Errorf("EarningsReleaseDelay() = %v, want %v", got, c.want)
			}
		})
	}
}

// The two product bounds, same fallback discipline. A malformed PAYOUT_MIN_NGN
// resolving to 0 would silently remove the minimum; a malformed
// CHECKOUT_MAX_NGN resolving to 0 would refuse every order.
func TestProductBounds_FallBackToLaunchDefaults(t *testing.T) {
	cases := []struct {
		key          string
		raw          string
		read         func() float64
		want         float64
		whyItMatters string
	}{
		{"PAYOUT_MIN_NGN", "", PayoutMinNGN, 1000, "unset"},
		{"PAYOUT_MIN_NGN", "abc", PayoutMinNGN, 1000, "garbage must not remove the minimum"},
		{"PAYOUT_MIN_NGN", "-1", PayoutMinNGN, 1000, "negative must not remove the minimum"},
		{"PAYOUT_MIN_NGN", "0", PayoutMinNGN, 0, "explicit 0 disables it"},
		{"PAYOUT_MIN_NGN", "2500", PayoutMinNGN, 2500, "a real override"},
		{"CHECKOUT_MAX_NGN", "", CheckoutMaxNGN, 1_000_000, "unset"},
		{"CHECKOUT_MAX_NGN", "abc", CheckoutMaxNGN, 1_000_000, "garbage must not refuse every order"},
		{"CHECKOUT_MAX_NGN", "5000000", CheckoutMaxNGN, 5_000_000, "a real override"},
	}

	for _, c := range cases {
		t.Run(c.key+"="+c.raw, func(t *testing.T) {
			t.Setenv(c.key, c.raw)
			if got := c.read(); got != c.want {
				t.Errorf("%s=%q -> %v, want %v (%s)", c.key, c.raw, got, c.want, c.whyItMatters)
			}
		})
	}
}
