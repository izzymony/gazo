package domain

// The payout lifecycle, as a state machine with an explicit accounting effect
// per transition.
//
// This exists because the previous implementation had neither. Withdrawal
// status was an untyped string; the model's own comment said
// "pending, approved, rejected" while the code wrote "completed"; and there was
// no state meaning "we have asked Paystack and are waiting". Approval therefore
// debited the wallet, wrote a ledger row marked completed, and told the seller
// the money was sent — all without a transfer existing. Three records asserting
// a payment that had not happened.
//
// Two rules follow from that, and everything here enforces them:
//
//  1. Only a VERIFIED provider outcome may move money. Approval authorises a
//     transfer; it does not perform one and must not record one.
//  2. When the outcome is unknown, the reservation is HELD. Releasing funds we
//     are not certain failed is what lets a seller be paid twice.

type WithdrawalStatus string

const (
	// The seller has asked and the funds are reserved (`pending_withdrawals`).
	WithdrawalRequested WithdrawalStatus = "requested"
	// Admin authorised it and a transfer has been claimed. The reservation is
	// still held; nothing has been debited.
	WithdrawalProcessing WithdrawalStatus = "processing"
	// Paystack returned `otp`: the transfer is real and waiting on a
	// confirmation step on the Paystack account. NOT a failure.
	WithdrawalAwaitingOTP WithdrawalStatus = "awaiting_otp"
	// Money has left. The only state reachable from a verified success.
	WithdrawalPaid WithdrawalStatus = "paid"
	// Definitively did not happen. The reservation has been returned.
	WithdrawalFailed WithdrawalStatus = "failed"
	// Stopped by Paystack risk/compliance. Terminal; needs a human.
	WithdrawalBlocked WithdrawalStatus = "blocked"
	// Paid, then the money came back.
	WithdrawalReversed WithdrawalStatus = "reversed"
	// Admin declined before any transfer existed.
	WithdrawalRejected WithdrawalStatus = "rejected"
	// We could not establish the outcome within the retry budget. The
	// reservation stays HELD deliberately — see rule 2.
	WithdrawalNeedsReview WithdrawalStatus = "needs_review"
)

// Written by the pre-payout-lifecycle code. Migration 015 maps `pending` to
// `requested`; `completed` is deliberately NOT mapped, because such a row means
// "an admin pressed approve and a human may or may not have sent the money by
// hand" and only a person can say which. They are left for reconciliation.
const (
	WithdrawalLegacyPending   WithdrawalStatus = "pending"
	WithdrawalLegacyCompleted WithdrawalStatus = "completed"
)

// PaystackTransferStatus is the `status` field on a transfer object or a
// `transfer.*` webhook. All eight are handled; anything unrecognised is treated
// as ambiguous rather than guessed at.
type PaystackTransferStatus string

const (
	PaystackTransferOTP       PaystackTransferStatus = "otp"
	PaystackTransferPending   PaystackTransferStatus = "pending"
	PaystackTransferSuccess   PaystackTransferStatus = "success"
	PaystackTransferFailed    PaystackTransferStatus = "failed"
	PaystackTransferRejected  PaystackTransferStatus = "rejected"
	PaystackTransferAbandoned PaystackTransferStatus = "abandoned"
	PaystackTransferBlocked   PaystackTransferStatus = "blocked"
	PaystackTransferReversed  PaystackTransferStatus = "reversed"
)

// NextStatusFor maps a provider status to the withdrawal state it implies,
// given where the withdrawal currently is.
//
// `current` matters for exactly one case, and it is the one that would
// otherwise corrupt the ledger: `reversed` means "release the reservation" if we
// never paid, but "credit the seller back" if we did. Collapsing those two into
// one handler is how a reversal ends up decrementing a reservation that no
// longer exists.
//
// ok=false means "no conclusion" — hold everything and let reconciliation try
// again. That is the answer for an unrecognised status, by design.
func NextStatusFor(current WithdrawalStatus, provider PaystackTransferStatus) (next WithdrawalStatus, ok bool) {
	switch provider {
	case PaystackTransferSuccess:
		return WithdrawalPaid, true
	case PaystackTransferOTP:
		return WithdrawalAwaitingOTP, true
	case PaystackTransferPending:
		return WithdrawalProcessing, true
	case PaystackTransferFailed, PaystackTransferRejected, PaystackTransferAbandoned:
		return WithdrawalFailed, true
	case PaystackTransferBlocked:
		return WithdrawalBlocked, true
	case PaystackTransferReversed:
		if current == WithdrawalPaid {
			return WithdrawalReversed, true
		}
		// Never paid, so there is nothing to compensate — it simply did not
		// happen, and the reservation goes back.
		return WithdrawalFailed, true
	default:
		return "", false
	}
}

// LedgerEffect is what a transition does to the wallet, expressed as multipliers
// of the withdrawal amount so the table below can be read and tested as data
// rather than traced through branches.
type LedgerEffect struct {
	// Multipliers applied to the withdrawal amount: -1, 0 or +1.
	AvailableDelta      int
	PendingDelta        int
	TotalWithdrawnDelta int
	// The ledger row this transition appends, or "" for none. The ledger is
	// append-only: a reversal adds a row, it never edits the original.
	LedgerRow string
	// Terminal states accept no further transitions except the ones listed.
	Terminal bool
}

const (
	LedgerRowWithdrawal         = "withdrawal"
	LedgerRowWithdrawalReversal = "withdrawal_reversal"
)

type transition struct {
	from WithdrawalStatus
	to   WithdrawalStatus
}

// The complete matrix. A transition absent from this map is illegal and is
// refused — which is what stops `requested -> paid` (paying without ever asking
// Paystack) and `failed -> paid` (paying after we already returned the funds).
var transitions = map[transition]LedgerEffect{
	// Admin declines before any transfer exists: return the reservation.
	{WithdrawalRequested, WithdrawalRejected}: {PendingDelta: -1, Terminal: true},

	// Admin authorises. Deliberately NO money movement: the reservation already
	// holds the funds, and nothing has left yet.
	{WithdrawalRequested, WithdrawalProcessing}: {},

	// In-flight shuffling. The transfer exists; the reservation stays held.
	{WithdrawalProcessing, WithdrawalAwaitingOTP}:  {},
	{WithdrawalAwaitingOTP, WithdrawalProcessing}:  {},
	{WithdrawalProcessing, WithdrawalProcessing}:   {},
	{WithdrawalAwaitingOTP, WithdrawalAwaitingOTP}: {},

	// The money actually left. This is the ONLY transition that debits, and it
	// is reachable only from a verified provider success.
	{WithdrawalProcessing, WithdrawalPaid}:  {AvailableDelta: -1, PendingDelta: -1, TotalWithdrawnDelta: +1, LedgerRow: LedgerRowWithdrawal},
	{WithdrawalAwaitingOTP, WithdrawalPaid}: {AvailableDelta: -1, PendingDelta: -1, TotalWithdrawnDelta: +1, LedgerRow: LedgerRowWithdrawal},

	// Definitively did not happen: the reservation goes back to available.
	{WithdrawalProcessing, WithdrawalFailed}:   {PendingDelta: -1},
	{WithdrawalAwaitingOTP, WithdrawalFailed}:  {PendingDelta: -1},
	{WithdrawalProcessing, WithdrawalBlocked}:  {PendingDelta: -1, Terminal: true},
	{WithdrawalAwaitingOTP, WithdrawalBlocked}: {PendingDelta: -1, Terminal: true},

	// Retry budget exhausted with no verdict. The reservation is HELD, because
	// we do not know that the money did not leave.
	{WithdrawalProcessing, WithdrawalNeedsReview}:  {},
	{WithdrawalAwaitingOTP, WithdrawalNeedsReview}: {},

	// A human resolved a stuck payout. Both directions are allowed so the
	// resolution is recorded through the same accounting as everything else.
	{WithdrawalNeedsReview, WithdrawalPaid}:   {AvailableDelta: -1, PendingDelta: -1, TotalWithdrawnDelta: +1, LedgerRow: LedgerRowWithdrawal},
	{WithdrawalNeedsReview, WithdrawalFailed}: {PendingDelta: -1},

	// The row that must not be got wrong.
	//
	// The reservation was CONSUMED at `paid` — it does not exist any more. This
	// is therefore a compensating CREDIT, not an unlock: available goes back up,
	// total_withdrawn goes back down, pending is untouched. Calling
	// UnlockBalance here would decrement a reservation that is already gone,
	// driving `pending_withdrawals` negative and inflating the seller's
	// effective balance (available - pending) by the payout amount — money
	// created out of a failed transfer.
	{WithdrawalPaid, WithdrawalReversed}: {AvailableDelta: +1, TotalWithdrawnDelta: -1, LedgerRow: LedgerRowWithdrawalReversal, Terminal: true},
}

// EffectOf reports the accounting for a transition, and whether it is legal at
// all. Callers must refuse the transition when ok is false rather than falling
// through to a default.
func EffectOf(from, to WithdrawalStatus) (LedgerEffect, bool) {
	e, ok := transitions[transition{from, to}]
	return e, ok
}

// IsTerminal reports whether a state accepts no further provider outcomes.
// `paid` is deliberately NOT terminal: a reversal can still arrive.
func IsTerminal(s WithdrawalStatus) bool {
	switch s {
	case WithdrawalRejected, WithdrawalBlocked, WithdrawalReversed, WithdrawalFailed:
		return true
	default:
		return false
	}
}

// AwaitingProvider reports whether reconciliation should still be asking
// Paystack about this withdrawal.
func AwaitingProvider(s WithdrawalStatus) bool {
	return s == WithdrawalProcessing || s == WithdrawalAwaitingOTP
}
