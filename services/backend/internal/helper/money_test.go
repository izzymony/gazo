package helper

import (
	"math"
	"testing"
)

// The cases that matter are the ones where `int(naira*100)` and
// `int64(math.Round(naira*100))` DISAGREE — everything else passes under either
// implementation and proves nothing. ₦8.29 is the one found in the shipped
// `ProcessWithdrawal`; the rest were found by scanning for disagreement.
func TestToKobo_RoundsRatherThanTruncates(t *testing.T) {
	cases := []struct {
		naira float64
		want  int64
		note  string
	}{
		{8.29, 829, "the live defect: 8.29*100 is 828.9999999999999"},
		{1.15, 115, "1.15*100 is 114.99999999999999"},
		{2.67, 267, ""},
		{87.35, 8735, ""},
		{1234.56, 123456, "a realistic payout"},
		{0.005, 1, "half a kobo rounds away from zero, not to it"},
		{0, 0, ""},
		{100, 10000, "whole naira is exact either way"},
		{0.01, 1, "smallest real amount"},
		{1_000_000.99, 100000099, "large payout keeps its kobo"},
	}

	for _, c := range cases {
		if got := ToKobo(c.naira); got != c.want {
			t.Errorf("ToKobo(%v) = %d, want %d  %s", c.naira, got, c.want, c.note)
		}
	}
}

// Pins the bug itself, so the test explains what it is defending against.
//
// The amounts come from a slice rather than a literal ON PURPOSE. Go evaluates
// `8.29 * 100` as an untyped constant expression at COMPILE time with arbitrary
// precision, yielding exactly 829 — so a test written with literals passes
// under the broken implementation too and proves nothing. The shipped defect is
// `int(request.Amount * 100)` on a struct FIELD, which is a runtime float64 and
// truncates. Routing through a slice reproduces that.
func TestToKobo_BeatsTheNaiveCast(t *testing.T) {
	// Verified to disagree at runtime on amd64/arm64.
	runtimeAmounts := []float64{8.29, 1.15}
	wantKobo := []int64{829, 115}

	for i, naira := range runtimeAmounts {
		naive := int64(naira * 100) // the shipped implementation
		if naive == wantKobo[i] {
			t.Errorf("ToKobo(%v): the naive cast gave %d, so this case no longer "+
				"reproduces the truncation and is not defending anything", naira, naive)
			continue
		}
		if got := ToKobo(naira); got != wantKobo[i] {
			t.Errorf("ToKobo(%v) = %d, want %d (naive cast loses a kobo at %d)",
				naira, got, wantKobo[i], naive)
		}
	}
}

func TestFromKobo(t *testing.T) {
	cases := []struct {
		kobo int64
		want float64
	}{{829, 8.29}, {0, 0}, {1, 0.01}, {123456, 1234.56}, {100000099, 1_000_000.99}}
	for _, c := range cases {
		if got := FromKobo(c.kobo); math.Abs(got-c.want) > 1e-9 {
			t.Errorf("FromKobo(%d) = %v, want %v", c.kobo, got, c.want)
		}
	}
}

// A payout is converted on the way out and displayed on the way back, so the
// pair has to be stable over the range of amounts a seller can actually request.
func TestToKoboFromKobo_RoundTripIsStable(t *testing.T) {
	for kobo := int64(0); kobo <= 2_000_00; kobo += 7 {
		if got := ToKobo(FromKobo(kobo)); got != kobo {
			t.Fatalf("round trip broke at %d kobo: got %d", kobo, got)
		}
	}
}
