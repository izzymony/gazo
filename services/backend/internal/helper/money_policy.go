package helper

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Money policy that is a PRODUCT decision rather than a structural one, read
// from the environment so it can change without a deploy.
//
// The distinction matters and is enforced by where each check lives. Positivity,
// whole-kobo precision and the provider's own limits are structural: they are
// hard-coded at the point of use and no environment variable can switch them
// off. The three values below are bounds the business chooses, and every one of
// them is read through a helper that **falls back to the launch default when the
// variable is missing or unparseable**, because a typo in a deploy config must
// never resolve to "no bound" or, worse, to zero.

// parsePositiveFloat reads a numeric env var, returning fallback for anything
// that is not a parseable, finite, non-negative number.
func parsePositiveFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil || v < 0 {
		return fallback
	}
	return v
}

// PayoutMinNGN is the smallest payout a seller may request, in naira.
//
// Launch default ₦1,000. A value of 0 is honoured and means "no minimum" — it
// has to be set explicitly, because an empty or malformed variable falling
// through to 0 would silently remove the bound.
func PayoutMinNGN() float64 {
	return parsePositiveFloat("PAYOUT_MIN_NGN", 1000)
}

// CheckoutMaxNGN is the largest order total that may be sent for collection, in
// naira. Launch default ₦1,000,000.
//
// This is the product ceiling. It is NOT the overflow guard: the payments client
// enforces its own hard limit in kobo regardless of this value, because that one
// protects an integer, not a business rule.
func CheckoutMaxNGN() float64 {
	return parsePositiveFloat("CHECKOUT_MAX_NGN", 1_000_000)
}

// ShippingQuoteTTL is how long a shipping price quote stays valid (G12).
//
// Launch default 24h, permissive on purpose: the point of binding a quote is to
// stop it pricing a different product, address or buyer, and a short expiry
// would add checkout friction without adding much safety. Unset, unparseable or
// negative falls back to the default; an explicit 0 means "expires
// immediately", which is only useful in a test.
func ShippingQuoteTTL() time.Duration {
	const fallbackMinutes = 24 * 60

	raw := strings.TrimSpace(os.Getenv("SHIPPING_QUOTE_TTL_MINUTES"))
	if raw == "" {
		return fallbackMinutes * time.Minute
	}
	minutes, err := strconv.ParseFloat(raw, 64)
	if err != nil || minutes < 0 {
		return fallbackMinutes * time.Minute
	}
	return time.Duration(minutes * float64(time.Minute))
}

// EarningsReleaseDelay is how long after a confirmed delivery a seller's
// earnings become available for payout (D1).
//
// Launch default 24h. Anything unset, unparseable or negative falls back to the
// default rather than releasing early — releasing money sooner than policy is
// the failure that cannot be undone, so a misconfiguration must fail towards
// waiting. `0` is honoured when set explicitly, for local testing.
//
// The boundary is inclusive: an item is releasable at or after
// `status_updated_at + EarningsReleaseDelay()`, and not before.
func EarningsReleaseDelay() time.Duration {
	const fallback = 24 * time.Hour

	raw := strings.TrimSpace(os.Getenv("EARNINGS_RELEASE_DELAY_HOURS"))
	if raw == "" {
		return fallback
	}
	hours, err := strconv.ParseFloat(raw, 64)
	if err != nil || hours < 0 {
		return fallback
	}
	return time.Duration(hours * float64(time.Hour))
}
