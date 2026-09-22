package controller

import (
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// D1 is a configurable policy (EARNINGS_RELEASE_DELAY_HOURS), and the seller
// screen has to state it. The balances response therefore reports it, so the
// web bundle never carries its own copy of the number.
//
// Why that matters here rather than being left to the frontend: this project
// already has KYC_WITHDRAWAL_GATE_NGN duplicated in five places — the release
// cron's nudges, the web pre-check and three notification templates each hold
// their own literal — so changing the env var silently desynchronises every
// message about the gate from the gate itself. A second copy of the release
// delay in the web bundle would reproduce that failure, and it fails quietly:
// the policy moves, the screen keeps promising the old one.
func TestWalletBalancesResponse_ReportsTheConfiguredReleaseDelay(t *testing.T) {
	wallet := &domain.Wallet{
		AvailableBalance:   31000,
		ClearingBalance:    4000,
		OrdersInProgress:   12500,
		TotalEarnings:      184300,
		TotalWithdrawn:     153300,
		PendingWithdrawals: 6000,
	}

	for _, c := range []struct {
		env  string
		want float64
	}{
		{"", 24},        // launch default
		{"24", 24},      // set explicitly
		{"48", 48},      // a longer window
		{"0", 0},        // released immediately, only useful locally
		{"garbage", 24}, // must NOT report "0 hours" to a seller
		{"-5", 24},
	} {
		t.Run("EARNINGS_RELEASE_DELAY_HOURS="+c.env, func(t *testing.T) {
			if c.env != "" {
				t.Setenv("EARNINGS_RELEASE_DELAY_HOURS", c.env)
			}
			got := walletBalancesResponse(wallet)

			hours, ok := got["release_delay_hours"].(float64)
			if !ok {
				t.Fatalf("release_delay_hours is %T, want float64 — the seller screen "+
					"reads this to say when earnings become available", got["release_delay_hours"])
			}
			if hours != c.want {
				t.Errorf("release_delay_hours = %v, want %v", hours, c.want)
			}
			// The whole point: the number on the screen is the number that moves
			// the money. If these ever disagree the copy is lying.
			if hours != helper.EarningsReleaseDelay().Hours() {
				t.Errorf("release_delay_hours (%v) does not match the delay the release "+
					"cron enforces (%v)", hours, helper.EarningsReleaseDelay().Hours())
			}
		})
	}
}

// The balances the screen already renders must keep their keys and values — the
// extraction must not have changed the contract.
func TestWalletBalancesResponse_KeepsTheExistingBalanceKeys(t *testing.T) {
	wallet := &domain.Wallet{
		AvailableBalance: 31000, ClearingBalance: 4000, OrdersInProgress: 12500,
		TotalEarnings: 184300, TotalWithdrawn: 153300,
	}
	got := walletBalancesResponse(wallet)

	for key, want := range map[string]float64{
		"available_balance":  31000,
		"clearing_balance":   4000,
		"orders_in_progress": 12500,
		"total_earnings":     184300,
		"total_withdrawn":    153300,
	} {
		if got[key] != want {
			t.Errorf("%s = %v, want %v", key, got[key], want)
		}
	}
}
