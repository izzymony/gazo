package domain

import "testing"

// The transition that, done wrong, creates money.
//
// At `paid` the reservation has already been consumed: the wallet was debited
// and `pending_withdrawals` decremented in the same step. A reversal arriving
// afterwards must therefore CREDIT the seller back, not "unlock" a reservation
// that no longer exists. Unlocking would decrement `pending_withdrawals` a
// second time, and because the effective balance is `available - pending`, a
// negative pending INFLATES what the seller can withdraw by the payout amount.
func TestPaidToReversed_CompensatesRatherThanUnlocking(t *testing.T) {
	e, ok := EffectOf(WithdrawalPaid, WithdrawalReversed)
	if !ok {
		t.Fatal("paid -> reversed must be a legal transition")
	}
	if e.PendingDelta != 0 {
		t.Errorf("PendingDelta = %d, want 0 — the reservation was consumed at `paid`; "+
			"touching it here drives pending_withdrawals negative and mints money",
			e.PendingDelta)
	}
	if e.AvailableDelta != +1 {
		t.Errorf("AvailableDelta = %d, want +1 — the seller must get the money back", e.AvailableDelta)
	}
	if e.TotalWithdrawnDelta != -1 {
		t.Errorf("TotalWithdrawnDelta = %d, want -1 — they did not, in the end, withdraw it", e.TotalWithdrawnDelta)
	}
	if e.LedgerRow != LedgerRowWithdrawalReversal {
		t.Errorf("LedgerRow = %q, want %q — the ledger is append-only; the original "+
			"withdrawal row stays and a reversal row is added beside it",
			e.LedgerRow, LedgerRowWithdrawalReversal)
	}
}

// A reversal BEFORE payment is a different event with different accounting, and
// conflating the two is the whole reason `NextStatusFor` takes the current state.
func TestReversedBeforePayment_IsAFailureNotACompensation(t *testing.T) {
	next, ok := NextStatusFor(WithdrawalProcessing, PaystackTransferReversed)
	if !ok || next != WithdrawalFailed {
		t.Fatalf("processing + reversed = %q (ok=%v), want %q: nothing was paid, so "+
			"there is nothing to compensate — the reservation simply goes back",
			next, ok, WithdrawalFailed)
	}
	e, _ := EffectOf(WithdrawalProcessing, WithdrawalFailed)
	if e.AvailableDelta != 0 || e.PendingDelta != -1 || e.LedgerRow != "" {
		t.Errorf("unexpected accounting for the never-paid reversal: %+v", e)
	}
}

// Only a verified success may debit. These are the transitions that would pay a
// seller without a transfer, or pay them twice.
func TestIllegalTransitionsAreRefused(t *testing.T) {
	illegal := []transition{
		{WithdrawalRequested, WithdrawalPaid}, // paid without ever asking Paystack
		{WithdrawalFailed, WithdrawalPaid},    // paid after the funds were returned
		{WithdrawalRejected, WithdrawalPaid},  // paid after being declined
		{WithdrawalReversed, WithdrawalPaid},  // re-paid after a reversal
		{WithdrawalPaid, WithdrawalFailed},    // "unpaid" without a reversal
		{WithdrawalPaid, WithdrawalPaid},      // double debit
		{WithdrawalBlocked, WithdrawalPaid},   // paid after compliance stopped it
		{WithdrawalRequested, WithdrawalReversed},
	}
	for _, tr := range illegal {
		if _, ok := EffectOf(tr.from, tr.to); ok {
			t.Errorf("%s -> %s is accepted but must be refused", tr.from, tr.to)
		}
	}
}

// Exactly one transition is allowed to debit the wallet, and it is reachable
// only from a state that means "Paystack has the transfer".
func TestOnlyVerifiedSuccessDebits(t *testing.T) {
	var debiting []transition
	for tr, e := range transitions {
		if e.AvailableDelta < 0 {
			debiting = append(debiting, tr)
		}
	}
	for _, tr := range debiting {
		if tr.to != WithdrawalPaid {
			t.Errorf("%s -> %s debits available but does not end at `paid`", tr.from, tr.to)
		}
		switch tr.from {
		case WithdrawalProcessing, WithdrawalAwaitingOTP, WithdrawalNeedsReview:
		default:
			t.Errorf("%s -> paid debits from a state that does not imply a live transfer", tr.from)
		}
	}
	if len(debiting) == 0 {
		t.Fatal("no transition debits the wallet — a payout can never complete")
	}
}

// Every legal transition must balance: a debit of available is matched by
// consuming the reservation, and nothing may move pending without a reason.
func TestReservationIsNeverDoubleReleased(t *testing.T) {
	for tr, e := range transitions {
		// Releasing the reservation and crediting available at once would return
		// the funds twice over.
		if e.PendingDelta < 0 && e.AvailableDelta > 0 {
			t.Errorf("%s -> %s both releases the reservation and credits available", tr.from, tr.to)
		}
		// A debit must consume the reservation that was covering it.
		if e.AvailableDelta < 0 && e.PendingDelta >= 0 {
			t.Errorf("%s -> %s debits available without consuming the reservation", tr.from, tr.to)
		}
		if e.TotalWithdrawnDelta > 0 && e.AvailableDelta >= 0 {
			t.Errorf("%s -> %s counts a withdrawal without debiting", tr.from, tr.to)
		}
	}
}

// All eight documented Paystack statuses resolve, and anything else refuses to
// guess. "No conclusion" is the safe answer: it holds the reservation.
func TestEveryPaystackStatusIsHandled(t *testing.T) {
	all := []PaystackTransferStatus{
		PaystackTransferOTP, PaystackTransferPending, PaystackTransferSuccess,
		PaystackTransferFailed, PaystackTransferRejected, PaystackTransferAbandoned,
		PaystackTransferBlocked, PaystackTransferReversed,
	}
	for _, s := range all {
		if _, ok := NextStatusFor(WithdrawalProcessing, s); !ok {
			t.Errorf("provider status %q is not handled", s)
		}
	}

	for _, unknown := range []PaystackTransferStatus{"", "queued", "on_hold", "SUCCESS"} {
		if next, ok := NextStatusFor(WithdrawalProcessing, unknown); ok {
			t.Errorf("unknown status %q resolved to %q; it must decline to conclude "+
				"so the reservation is held", unknown, next)
		}
	}
}

// `otp` is a live transfer awaiting confirmation. Treating it as a failure would
// release funds for a payout that is still going to happen.
func TestOTPIsNotAFailure(t *testing.T) {
	next, ok := NextStatusFor(WithdrawalProcessing, PaystackTransferOTP)
	if !ok || next != WithdrawalAwaitingOTP {
		t.Fatalf("otp resolved to %q, want %q", next, WithdrawalAwaitingOTP)
	}
	e, ok := EffectOf(WithdrawalProcessing, WithdrawalAwaitingOTP)
	if !ok {
		t.Fatal("processing -> awaiting_otp must be legal")
	}
	if e.PendingDelta != 0 || e.AvailableDelta != 0 {
		t.Errorf("awaiting_otp moved money (%+v); the transfer is still in flight", e)
	}
	if !AwaitingProvider(WithdrawalAwaitingOTP) {
		t.Error("awaiting_otp must keep being reconciled")
	}
}

// `paid` is not terminal: a reversal can still arrive and must be accepted.
func TestPaidStaysOpenToReversal(t *testing.T) {
	if IsTerminal(WithdrawalPaid) {
		t.Error("paid must not be terminal — a reversal can follow it")
	}
	for _, s := range []WithdrawalStatus{WithdrawalRejected, WithdrawalBlocked, WithdrawalReversed, WithdrawalFailed} {
		if !IsTerminal(s) {
			t.Errorf("%s should be terminal", s)
		}
	}
}

// needs_review means "we do not know", and not knowing must never release funds.
func TestNeedsReviewHoldsTheReservation(t *testing.T) {
	e, ok := EffectOf(WithdrawalProcessing, WithdrawalNeedsReview)
	if !ok {
		t.Fatal("processing -> needs_review must be legal")
	}
	if e.PendingDelta != 0 || e.AvailableDelta != 0 || e.LedgerRow != "" {
		t.Errorf("needs_review moved money (%+v); an unknown outcome must hold everything", e)
	}
}
