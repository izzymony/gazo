package crons

import (
	"os"
	"testing"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// D1: earnings become available for payout EARNINGS_RELEASE_DELAY_HOURS after a
// confirmed delivery — 24h at launch.
//
// The boundary is the whole point, so it is tested at the exact instant and one
// nanosecond either side of it. A test at "23h" and "25h" would pass under `<`,
// `<=`, `>` and `>=` alike and would be pinning nothing.
func TestReleasable_BoundaryIsInclusive(t *testing.T) {
	const delay = 24 * time.Hour
	delivered := time.Date(2026, 9, 21, 9, 0, 0, 0, time.UTC)
	due := delivered.Add(delay)

	cases := []struct {
		name string
		now  time.Time
		want bool
	}{
		{"immediately after delivery", delivered, false},
		{"one nanosecond before the window elapses", due.Add(-time.Nanosecond), false},
		{"one second before", due.Add(-time.Second), false},
		{"exactly at the window — must release", due, true},
		{"one nanosecond after", due.Add(time.Nanosecond), true},
		{"a day later", due.Add(24 * time.Hour), true},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := releasable("delivered", false, delivered, c.now, delay); got != c.want {
				t.Errorf("releasable(now=%v) = %v, want %v (delivered %v, due %v)",
					c.now.Format(time.RFC3339Nano), got, c.want, delivered, due)
			}
		})
	}
}

// The boundary has to move with the policy, not with a literal. If either call
// site kept a hardcoded 24h this fails, because a 2-hour window would still be
// waiting 24.
func TestReleasable_TracksTheConfiguredDelay(t *testing.T) {
	delivered := time.Date(2026, 9, 21, 9, 0, 0, 0, time.UTC)

	for _, hours := range []string{"0", "1", "2", "48"} {
		t.Setenv("EARNINGS_RELEASE_DELAY_HOURS", hours)
		delay := helper.EarningsReleaseDelay()

		if releasable("delivered", false, delivered, delivered.Add(delay).Add(-time.Nanosecond), delay) {
			t.Errorf("delay=%sh: released BEFORE the window elapsed", hours)
		}
		if !releasable("delivered", false, delivered, delivered.Add(delay), delay) {
			t.Errorf("delay=%sh: did NOT release at the window", hours)
		}
	}
}

// Everything else the sweep guards on, so the boundary fix cannot have loosened
// the other two conditions. `vendor_credited` is the idempotency flag: an item
// past its window that has already been credited must never be credited again.
func TestReleasable_StillRequiresDeliveredAndUncredited(t *testing.T) {
	delivered := time.Date(2026, 9, 21, 9, 0, 0, 0, time.UTC)
	wellPast := delivered.Add(30 * 24 * time.Hour)
	const delay = 24 * time.Hour

	if releasable("shipped", false, delivered, wellPast, delay) {
		t.Error("a shipped item was released — only delivered items accrue to available")
	}
	if releasable("cancelled", false, delivered, wellPast, delay) {
		t.Error("a cancelled item was released")
	}
	if releasable("delivered", true, delivered, wellPast, delay) {
		t.Error("an already-credited item was released again — this is a double credit")
	}
}

// The sweep's SQL predicate and its in-transaction re-check must agree. The SQL
// side selects `status_updated_at <= now - delay`, which is the same inclusive
// boundary `releasable` applies; this pins that they cannot drift, by computing
// the cutoff the same way the sweep does and checking both answers match.
func TestReleaseCutoff_MatchesThePredicate(t *testing.T) {
	os.Unsetenv("EARNINGS_RELEASE_DELAY_HOURS")
	delay := helper.EarningsReleaseDelay()
	now := time.Date(2026, 9, 22, 12, 0, 0, 0, time.UTC)
	cutoff := now.Add(-delay)

	for _, offset := range []time.Duration{-time.Hour, -time.Nanosecond, 0, time.Nanosecond, time.Hour} {
		statusUpdatedAt := cutoff.Add(offset)
		// What the SQL WHERE clause would decide.
		selectedBySQL := !statusUpdatedAt.After(cutoff)
		// What the locked re-check decides.
		allowedByPredicate := releasable("delivered", false, statusUpdatedAt, now, delay)

		if selectedBySQL != allowedByPredicate {
			t.Errorf("offset %v from cutoff: SQL would select=%v but the predicate says=%v — "+
				"the sweep would fetch rows it then silently skips, or vice versa",
				offset, selectedBySQL, allowedByPredicate)
		}
	}
}
