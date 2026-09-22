package helper

import "math"

// Money crosses a boundary twice in this system, and both crossings are lossy if
// done naively.
//
// Balances are stored as PostgreSQL `numeric` — exact decimal, no rounding error
// — but they are carried in Go as `float64`, which is binary and cannot
// represent most decimal fractions. Paystack, meanwhile, speaks only integer
// kobo. So every amount that leaves for Paystack is converted, and a naive
// conversion silently loses money:
//
//	int(8.29 * 100) == 828    // 8.29*100 is 828.9999999999999 in IEEE 754
//
// That is a real kobo, gone, on a real payout, with no error anywhere. Rounding
// instead of truncating is the whole fix:
//
//	ToKobo(8.29) == 829
//
// These are deliberately the ONLY way money is converted for a provider call.
// The longer-term answer is to carry int64 minor units through the domain and
// stop round-tripping through float at all; that refactor is tracked separately
// because it touches every money surface and both frontends. Until then, this
// keeps the error at the boundary rather than in the ledger.

// ToKobo converts an amount in naira to integer kobo, rounding to the nearest
// unit rather than truncating.
//
// `math.Round` rounds half away from zero, which is what a person checking the
// arithmetic expects: 0.005 naira becomes 1 kobo, not 0. Bankers' rounding would
// be defensible for a long series of internal calculations, but this is a single
// boundary conversion of an amount a seller has already been shown, and
// surprising them by a kobo in the platform's favour is worse than the
// statistical bias.
func ToKobo(naira float64) int64 {
	return int64(math.Round(naira * 100))
}

// FromKobo converts integer kobo back to naira.
//
// Exact for every value Paystack will return: float64 has 53 bits of mantissa,
// so integers up to 2^53 are represented exactly, and the division by 100 is the
// only rounding step. A transfer would have to exceed ~90 trillion naira before
// this lost precision.
func FromKobo(kobo int64) float64 {
	return float64(kobo) / 100
}
