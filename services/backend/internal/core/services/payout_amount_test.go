package services

import (
	"strings"
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
)

// G2, at the service boundary. Three rules, tested separately because they fail
// for different reasons and a caller needs to be told which one they broke.
func TestValidatePayoutAmount(t *testing.T) {
	t.Setenv("PAYOUT_MIN_NGN", "1000")

	cases := []struct {
		name         string
		amount       float64
		wantErr      string
		whyItMatters string
	}{
		{
			name: "a negative amount", amount: -1000, wantErr: "greater than zero",
			whyItMatters: "`binding:\"required\"` accepted this, and LockBalance then " +
				"DECREMENTED the reservation — inflating the withdrawable balance",
		},
		{name: "zero", amount: 0, wantErr: "greater than zero"},
		{name: "a fraction of a kobo", amount: -0.001, wantErr: "greater than zero"},
		{
			name: "sub-kobo precision", amount: 1000.005, wantErr: "whole kobo",
			whyItMatters: "stored as ₦1000.005, transferred as ₦1000.01 — the ledger and " +
				"the bank disagree by a kobo, permanently",
		},
		{name: "sub-kobo on a large amount", amount: 250000.0001, wantErr: "whole kobo"},
		{name: "below the configured minimum", amount: 999.99, wantErr: "minimum payout"},
		{name: "one kobo below the minimum", amount: 999.99, wantErr: "minimum payout"},

		{name: "exactly the minimum", amount: 1000, wantErr: ""},
		{name: "whole naira above it", amount: 2500, wantErr: ""},
		{name: "whole kobo above it", amount: 2500.25, wantErr: ""},
		{name: "one kobo above the minimum", amount: 1000.01, wantErr: ""},
		{name: "a large valid payout", amount: 1_250_000.99, wantErr: ""},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validatePayoutAmount(c.amount)
			if c.wantErr == "" {
				if err != nil {
					t.Errorf("validatePayoutAmount(%v) = %v, want nil", c.amount, err)
				}
				return
			}
			if err == nil {
				t.Errorf("validatePayoutAmount(%v) = nil, want an error containing %q. %s",
					c.amount, c.wantErr, c.whyItMatters)
				return
			}
			if !strings.Contains(err.Error(), c.wantErr) {
				t.Errorf("validatePayoutAmount(%v) = %q, want it to mention %q",
					c.amount, err, c.wantErr)
			}
		})
	}
}

// The minimum is policy and moves with the environment; positivity and
// whole-kobo precision are structural and must hold at every setting. A
// misconfigured bound must not be able to re-open G2.
func TestValidatePayoutAmount_StructuralRulesSurviveAnyMinimum(t *testing.T) {
	for _, minimum := range []string{"", "0", "abc", "-5", "1", "1000", "50000"} {
		t.Setenv("PAYOUT_MIN_NGN", minimum)

		if err := validatePayoutAmount(-1000); err == nil {
			t.Errorf("PAYOUT_MIN_NGN=%q: a negative amount was accepted", minimum)
		}
		if err := validatePayoutAmount(0); err == nil {
			t.Errorf("PAYOUT_MIN_NGN=%q: zero was accepted", minimum)
		}
		if err := validatePayoutAmount(60000.005); err == nil {
			t.Errorf("PAYOUT_MIN_NGN=%q: a sub-kobo amount was accepted", minimum)
		}
	}
}

// With the minimum explicitly disabled, a small valid amount goes through —
// so the bound is genuinely configurable and not a disguised constant.
func TestValidatePayoutAmount_MinimumIsConfigurable(t *testing.T) {
	t.Setenv("PAYOUT_MIN_NGN", "1000")
	if err := validatePayoutAmount(500); err == nil {
		t.Fatal("₦500 was accepted with a ₦1000 minimum")
	}

	t.Setenv("PAYOUT_MIN_NGN", "0")
	if err := validatePayoutAmount(500); err != nil {
		t.Fatalf("₦500 was refused with the minimum disabled: %v", err)
	}
	if err := validatePayoutAmount(0.01); err != nil {
		t.Fatalf("one kobo was refused with the minimum disabled: %v", err)
	}
}

// validatePayoutAmount being correct is worthless if RequestWithdrawal does not
// call it. Mutation testing found exactly that hole: neutering the call site
// still compiled and left the suite green, because the unit tests above call
// the predicate directly.
//
// This calls the real entry point. The amount check is the FIRST thing it does,
// ahead of the business lookup, the KYC gate and the OTP, so an invalid amount
// returns before anything touches the database — which is both why an empty
// database is enough here, and the property worth having: a malformed amount
// must not be able to consume a one-time code on its way to being rejected.
func TestRequestWithdrawal_ValidatesTheAmountBeforeTouchingAnything(t *testing.T) {
	t.Setenv("PAYOUT_MIN_NGN", "1000")

	db, _ := openTestDB(t)
	svc := NewWalletService(db)

	cases := []struct {
		name   string
		amount float64
		want   string
	}{
		{"negative", -1000, "greater than zero"},
		{"zero", 0, "greater than zero"},
		{"sub-kobo", 1500.005, "whole kobo"},
		{"below the minimum", 500, "minimum payout"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := svc.RequestWithdrawal("no-such-user", requests.WithdrawalRequest{
				Amount: c.amount,
				Otp:    "000000",
			})
			if err == nil {
				t.Fatalf("RequestWithdrawal accepted %v", c.amount)
			}
			if !strings.Contains(err.Error(), c.want) {
				t.Errorf("RequestWithdrawal(%v) = %q, want it to mention %q — if this says "+
					"%q the amount check is not being reached and the guard is not wired in",
					c.amount, err, c.want, err)
			}
		})
	}
}
