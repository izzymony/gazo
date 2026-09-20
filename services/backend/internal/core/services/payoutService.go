package services

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/payments"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// The seller payout lifecycle.
//
// What this replaces: admin approval used to debit the wallet, write a ledger
// row marked `completed`, and notify the seller that the money had been sent —
// with no Paystack call anywhere in the path. Whether money actually moved
// depended on someone remembering to make a bank transfer by hand, and nothing
// recorded whether they had.
//
// Two invariants hold everything here together:
//
//  1. Only a VERIFIED provider outcome moves money. Approval authorises a
//     transfer; `Finalize` is the only thing that debits, and it runs from a
//     Paystack webhook or a Paystack verification, never from a button.
//  2. An unknown outcome HOLDS the reservation. Timeouts, 5xx and unreadable
//     replies leave the withdrawal `processing` with the seller's funds still
//     locked, because releasing funds we are not certain failed is what lets
//     the same money be withdrawn twice.

// ErrPayoutsDisabled is returned when payouts are switched off or the Paystack
// readiness preflight has not been recorded as passing.
//
// It is returned BEFORE any state change. The failure this exists to prevent is
// the one the old code shipped: a system that cannot pay quietly recording that
// it paid.
// ErrPayoutsDisabled is returned BEFORE any state change, so an approval that
// hits it leaves the withdrawal exactly as it was. The message is written for
// the admin who sees it: the important part is that nothing happened, because
// the failure this whole design exists to prevent is a system that cannot pay
// recording that it paid.
var ErrPayoutsDisabled = errors.New("payouts are disabled — no transfer can be sent, so this withdrawal has not been approved and no money has moved")

// ErrNotClaimable is returned when a withdrawal is not in a state a transfer
// can be started from — usually because another request already claimed it.
var ErrNotClaimable = errors.New("withdrawal is not awaiting approval")

// maxTransferAttempts bounds retries. Past it the withdrawal goes to
// `needs_review` with its reservation still held, for a human to resolve
// against the Paystack dashboard.
const maxTransferAttempts = 5

// TransferClient is the slice of Paystack this service needs, as an interface
// so the lifecycle can be tested against timeouts, 5xx and reversals without a
// network.
type TransferClient interface {
	InitiateTransfer(payments.InitiateTransferInput) payments.TransferResult
	VerifyTransfer(reference string) payments.TransferResult
	EnsureTransferRecipient(*domain.BusinessBankAccountDetail) (string, error)
}

type PayoutService struct {
	db       *gorm.DB
	transfer TransferClient
	// notify is called after a transition commits. Post-commit and
	// best-effort: a notification failure must never roll back money.
	notify func(event, userID string, vars map[string]string)
}

func NewPayoutService(db *gorm.DB, transfer TransferClient, notify func(string, string, map[string]string)) *PayoutService {
	if notify == nil {
		notify = func(string, string, map[string]string) {}
	}
	return &PayoutService{db: db, transfer: transfer, notify: notify}
}

// PayoutsLive reports whether live payouts are enabled.
//
// Defaults to FALSE. A payout system that turns itself on because an
// environment variable is missing is the wrong default in exactly the
// direction that moves money.
func PayoutsLive() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("PAYOUTS_LIVE")), "true")
}

// ApproveAndTransfer is the admin action. It runs the three-step flow that
// keeps the network call outside any database transaction:
//
//	Txn 1  claim: requested -> processing, persist the permanent reference
//	call   Paystack, holding no locks
//	Txn 2  record the outcome
//
// The reference is committed BEFORE the call on purpose. If this process dies
// mid-call, the withdrawal is left `processing` carrying a reference the
// reconciler can ask Paystack about — and because Paystack deduplicates on it,
// re-initiating is a no-op rather than a second payout.
func (s *PayoutService) ApproveAndTransfer(requestID string) error {
	if !PayoutsLive() {
		// No state change, no wallet movement, no notification.
		return ErrPayoutsDisabled
	}

	req, account, err := s.claimForTransfer(requestID)
	if err != nil {
		return err
	}

	if err := s.ensureRecipient(account); err != nil {
		// Releasing the reservation is safe here in a way it is NEVER safe after
		// the transfer call: registering the recipient happens strictly BEFORE
		// `POST /transfer`, so no transfer can be in flight and there is nothing
		// to double-pay. The seller gets their balance back immediately instead
		// of waiting for a reconciler round.
		return s.applyTransition(req.ID, domain.WithdrawalProcessing, domain.WithdrawalFailed,
			payments.TransferResult{
				Outcome: payments.TransferDefinitivelyRejected,
				Reason:  "could not register payout account with Paystack: " + err.Error(),
			})
	}

	// The seller hears "processing", not "sent". This is the honest statement at
	// this point: a transfer has been authorised and nothing has moved yet. The
	// "sent" message now waits for Paystack to confirm it, which is the whole
	// point of the change — the old flow announced a completed payment here.
	s.notify("seller.payout.withdrawal_processing", req.UserID, map[string]string{
		"amount": FormatNaira(req.Amount),
		"bank":   bankLabel(account),
	})

	result := s.transfer.InitiateTransfer(payments.InitiateTransferInput{
		Account:   account,
		Amount:    req.Amount,
		Reason:    "Vibaar seller payout",
		Reference: req.ProviderReference,
	})

	return s.recordInitiation(req, result)
}

// ensureRecipient guarantees the account has a Paystack transfer recipient, and
// CACHES it on the row.
//
// This is not an optimisation. `InitiateTransfer` definitively rejects a
// transfer whose account has no recipient code, and no code ever wrote one:
// the only function that created recipients had zero call sites, so every bank
// account in every environment starts without one. Verified locally — 0 of 1
// accounts had a code. Without this, the first withdrawal for every existing
// seller would fail, and the failure would read as "check your bank details"
// when the account was fine.
//
// New accounts are registered when they are added (see BusinessService), so in
// steady state this finds the code already there and makes no network call. It
// stays as the backstop for accounts that predate that, and for one that was
// added while Paystack was unreachable.
func (s *PayoutService) ensureRecipient(account *domain.BusinessBankAccountDetail) error {
	if account == nil {
		return fmt.Errorf("no payout account on this withdrawal")
	}
	code, err := s.transfer.EnsureTransferRecipient(account)
	if err != nil {
		return err
	}
	if code == "" {
		return fmt.Errorf("paystack returned an empty recipient code")
	}
	if code == account.PaystackRecipientCode {
		return nil
	}
	account.PaystackRecipientCode = code
	return s.db.Model(&domain.BusinessBankAccountDetail{}).
		Where("id = ?", account.ID).
		Update("paystack_recipient_code", code).Error
}

// RegisterPayoutAccount caches a Paystack recipient for a newly added or edited
// bank account, so the first withdrawal does not pay for the round trip and an
// unusable account is discovered while the seller is still looking at the form.
//
// Best-effort by contract: the caller ignores the error. A Paystack outage must
// not stop a seller saving their bank details, and `ensureRecipient` covers the
// miss at payout time.
func (s *PayoutService) RegisterPayoutAccount(account *domain.BusinessBankAccountDetail) error {
	return s.ensureRecipient(account)
}

// newPayoutReference mints the idempotency key for one payout.
//
// It is Paystack's deduplication handle: re-sending with the same reference is
// a no-op there rather than a second payout, which is what makes the recovery
// path safe. So it must round-trip through Paystack unchanged and never
// collide with another payout's.
//
// The charset is letters, digits and the hyphen in the prefix — the
// conservative intersection of what Paystack accepts. Probed against the live
// API: the uppercase form is accepted, stored with its case intact, and
// retrievable by GET /transfer/verify/<that exact string>. Case preservation
// is the property that matters, because if Paystack lowercased it, verifying
// by the string we saved would 404 and the reconciler would read that as
// "never created".
func newPayoutReference() string {
	return "VBR-PO-" + helper.RandomString(18)
}

// bankLabel renders the payout account the way the seller recognises it —
// "GTBank ••4321" — for the {{bank}} placeholder the payout copy uses.
//
// Supplying it is not optional. `renderVars` deliberately leaves an unknown
// placeholder intact so a missing variable is caught in QA, which means the
// alternative to passing this is a seller reading "Sent to your {{bank}}."
//
// The number is masked to its last four. These messages escalate to WhatsApp,
// and a full account number sitting in a chat history is a disclosure we get
// nothing for — four digits are enough to tell two of your own accounts apart.
func bankLabel(account *domain.BusinessBankAccountDetail) string {
	if account == nil {
		return "bank account"
	}
	return maskedBankLabel(account.Bank, account.AccountNumber)
}

// maskedBankLabel is the one place this string is built. It was open-coded in
// three places with two different behaviours for a missing bank name, which is
// how "••" ends up rendering differently in two messages about the same account.
func maskedBankLabel(bank, accountNumber string) string {
	name := strings.TrimSpace(bank)
	if name == "" {
		name = "bank account"
	}
	number := strings.TrimSpace(accountNumber)
	if len(number) < 4 {
		return name
	}
	return name + " ••" + number[len(number)-4:]
}

// claimForTransfer is Txn 1. The guarded UPDATE is the concurrency control: two
// admins pressing approve at the same moment produce one winner and one
// ErrNotClaimable, with no row-level coordination beyond the status itself.
func (s *PayoutService) claimForTransfer(requestID string) (*domain.WithdrawalRequest, *domain.BusinessBankAccountDetail, error) {
	var req domain.WithdrawalRequest
	var account domain.BusinessBankAccountDetail

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", requestID).First(&req).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("withdrawal request not found")
			}
			return err
		}
		if domain.WithdrawalStatus(req.Status) != domain.WithdrawalRequested {
			return fmt.Errorf("%w: status is %q", ErrNotClaimable, req.Status)
		}
		if err := tx.Where("id = ?", req.BankAccountDetailsID).First(&account).Error; err != nil {
			return fmt.Errorf("bank account not found: %w", err)
		}

		// Generated once and never regenerated. Every retry for this withdrawal
		// reuses it, which is what makes Paystack's own deduplication work for
		// us instead of against us.
		if req.ProviderReference == "" {
			req.ProviderReference = newPayoutReference()
		}
		now := time.Now()
		req.Status = string(domain.WithdrawalProcessing)
		req.Provider = "paystack"
		req.AttemptCount++
		req.ApprovedAt = &now
		req.ProcessingAt = &now

		res := tx.Model(&domain.WithdrawalRequest{}).
			Where("id = ? AND status = ?", requestID, string(domain.WithdrawalRequested)).
			Updates(map[string]any{
				"status":             req.Status,
				"provider":           req.Provider,
				"provider_reference": req.ProviderReference,
				"attempt_count":      req.AttemptCount,
				"approved_at":        req.ApprovedAt,
				"processing_at":      req.ProcessingAt,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected != 1 {
			return ErrNotClaimable
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	return &req, &account, nil
}

// recordInitiation is Txn 2, and the place where [C1] is enforced: only a
// definitive rejection releases the seller's reservation.
func (s *PayoutService) recordInitiation(req *domain.WithdrawalRequest, result payments.TransferResult) error {
	switch result.Outcome {
	case payments.TransferAccepted:
		next, ok := domain.NextStatusFor(domain.WithdrawalProcessing, result.Status)
		if !ok {
			// Unreachable via the client (it classifies unknown statuses as
			// ambiguous), but treated the same way if it ever is: hold.
			return s.markAmbiguous(req, fmt.Sprintf("unrecognised status %q", result.Status))
		}
		return s.Finalize(req.ProviderReference, result, next)

	case payments.TransferDefinitivelyRejected:
		return s.applyTransition(req.ID, domain.WithdrawalProcessing, domain.WithdrawalFailed, result)

	case payments.TransferAlreadyExists:
		// Paystack is holding a transfer for this reference. That is the
		// opposite of a refusal, so it must not reach the branch above.
		return s.resolveExistingTransfer(req, result.Reason)

	default: // ambiguous
		return s.markAmbiguous(req, result.Reason)
	}
}

// resolveExistingTransfer settles a payout Paystack says it already has.
//
// Reached when initiation is refused for a duplicate reference, which happens
// in ordinary operation: verification can answer "not found" in the window
// before a transfer becomes visible, the reconciler re-sends on that answer,
// and Paystack then refuses the reference. The wrong move at that moment is to
// read the 400 as a rejection and give the seller their reservation back —
// there is a live transfer for the same payout, and they could withdraw it
// twice.
//
// So the answer comes from the transfer itself, and every path that does not
// produce a verified verdict HOLDS.
func (s *PayoutService) resolveExistingTransfer(req *domain.WithdrawalRequest, why string) error {
	current := domain.WithdrawalStatus(req.Status)
	verified := s.transfer.VerifyTransfer(req.ProviderReference)

	switch verified.Outcome {
	case payments.TransferAccepted:
		next, ok := domain.NextStatusFor(current, verified.Status)
		if !ok {
			return s.markAmbiguous(req, fmt.Sprintf("%s; unrecognised status %q", why, verified.Status))
		}
		return s.Finalize(req.ProviderReference, verified, next)

	case payments.TransferDefinitivelyRejected:
		// The existing transfer itself failed. Now releasing is correct.
		return s.applyTransition(req.ID, current, domain.WithdrawalFailed, verified)

	default:
		// Includes TransferNotFound, which is a contradiction: Paystack says
		// the reference is taken and then cannot show us the transfer. A
		// contradiction is the least safe moment to release money, so it holds
		// and a human sees it if it persists.
		return s.markAmbiguous(req, fmt.Sprintf("%s; verification inconclusive: %s", why, verified.Reason))
	}
}

// markAmbiguous records why we do not know, and changes nothing else. The
// withdrawal stays `processing` and the reservation stays held.
func (s *PayoutService) markAmbiguous(req *domain.WithdrawalRequest, reason string) error {
	return s.db.Model(&domain.WithdrawalRequest{}).
		Where("id = ?", req.ID).
		Updates(map[string]any{
			"failure_reason":  truncateReason(reason),
			"provider_status": "",
		}).Error
}

// Finalize applies a provider outcome. It is the ONE path to a terminal state —
// the webhook handler and the reconciler both call it, so a payout is accounted
// for identically however the news arrives.
//
// `reference` identifies the withdrawal; `next` is the state the provider
// status implies for wherever it currently is.
func (s *PayoutService) Finalize(reference string, result payments.TransferResult, next domain.WithdrawalStatus) error {
	var req domain.WithdrawalRequest
	q := s.db.Where("provider_reference = ?", reference)
	if reference == "" && result.TransferCode != "" {
		q = s.db.Where("provider_transfer_code = ?", result.TransferCode)
	}
	if err := q.First(&req).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// A transfer we did not initiate, or one for another environment.
			// Not an error: acknowledging is correct so Paystack stops retrying.
			return nil
		}
		return err
	}

	// Already there. Paystack guarantees at-least-once delivery, so the SAME
	// `transfer.success` arrives two or three times in normal operation, and the
	// reconciler independently re-verifies transfers it is unsure about — so the
	// same news reaches this function from two directions.
	//
	// This is not the guard; the guarded UPDATE below is, and it is what makes a
	// genuine race safe. This is the difference between a no-op and an ERROR: a
	// redelivery is not a fault, and returning one here would make the webhook
	// controller answer non-2xx, so Paystack would retry the same event for
	// hours and every redelivery would page someone.
	//
	// It deliberately does NOT weaken the matrix. Only the identical outcome is
	// absorbed; `paid -> failed` still falls through to applyTransition and is
	// refused there, because that is contradictory news rather than repeated
	// news, and it must be seen by a human rather than swallowed.
	if domain.WithdrawalStatus(req.Status) == next {
		return nil
	}

	return s.applyTransition(req.ID, domain.WithdrawalStatus(req.Status), next, result)
}

// applyTransition is where the accounting matrix is executed.
//
// Idempotency is structural, not remembered: the UPDATE is guarded on the
// expected current status, so a repeated webhook finds zero rows and returns
// without touching money. No event id is stored or trusted.
func (s *PayoutService) applyTransition(requestID string, from, to domain.WithdrawalStatus, result payments.TransferResult) error {
	effect, legal := domain.EffectOf(from, to)
	if !legal {
		// Refusing is the point: this is what stops `failed -> paid` and
		// `requested -> paid`, either of which pays without a verified transfer.
		return fmt.Errorf("illegal payout transition %s -> %s", from, to)
	}

	var (
		committed bool
		sellerID  string
		amount    float64
		accountID string
	)

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var req domain.WithdrawalRequest
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", requestID).First(&req).Error; err != nil {
			return err
		}
		sellerID, amount, accountID = req.UserID, req.Amount, req.BankAccountDetailsID

		updates := map[string]any{
			"status":          string(to),
			"provider_status": string(result.Status),
		}
		if result.TransferCode != "" {
			updates["provider_transfer_code"] = result.TransferCode
		}
		if result.Fee > 0 {
			updates["transfer_fee"] = result.Fee
		}
		if result.Reason != "" {
			updates["failure_reason"] = truncateReason(result.Reason)
		}
		now := time.Now()
		switch to {
		case domain.WithdrawalPaid:
			updates["paid_at"] = &now
		case domain.WithdrawalFailed, domain.WithdrawalBlocked:
			updates["failed_at"] = &now
		case domain.WithdrawalReversed:
			updates["reversed_at"] = &now
		}

		// THE guard. Zero rows means someone already moved it on.
		res := tx.Model(&domain.WithdrawalRequest{}).
			Where("id = ? AND status = ?", requestID, string(from)).
			Updates(updates)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected != 1 {
			return nil // already applied; not an error
		}

		if err := s.applyLedgerEffect(tx, &req, effect, result); err != nil {
			return err
		}
		committed = true
		return nil
	})
	if err != nil || !committed {
		return err
	}

	// Post-commit, best-effort. Money is already durable; a notification
	// failure must not undo it.
	vars := map[string]string{
		"amount": FormatNaira(amount),
		"bank":   bankLabel(s.lookupAccount(accountID)),
	}
	switch to {
	case domain.WithdrawalPaid:
		s.notify("seller.payout.withdrawal_sent", sellerID, vars)
	case domain.WithdrawalFailed, domain.WithdrawalBlocked:
		s.notify("seller.payout.withdrawal_failed", sellerID, vars)
	case domain.WithdrawalReversed:
		s.notify("seller.payout.withdrawal_reversed", sellerID, vars)
	}
	return nil
}

// lookupAccount reads the payout account for notification copy only. A miss is
// not an error: the money has already moved and a missing bank name must not
// turn a successful payout into a failure.
func (s *PayoutService) lookupAccount(id string) *domain.BusinessBankAccountDetail {
	if id == "" {
		return nil
	}
	var account domain.BusinessBankAccountDetail
	if err := s.db.Where("id = ?", id).First(&account).Error; err != nil {
		return nil
	}
	return &account
}

// applyLedgerEffect moves the wallet and appends the ledger row, per the matrix.
//
// The deltas are multipliers of the withdrawal amount, so this function does not
// decide anything — `domain.transitions` does, and it is a table that can be
// read and tested on its own.
func (s *PayoutService) applyLedgerEffect(tx *gorm.DB, req *domain.WithdrawalRequest, effect domain.LedgerEffect, result payments.TransferResult) error {
	if effect.AvailableDelta == 0 && effect.PendingDelta == 0 && effect.TotalWithdrawnDelta == 0 && effect.LedgerRow == "" {
		return nil
	}

	var wallet domain.Wallet
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", req.WalletID).First(&wallet).Error; err != nil {
		return fmt.Errorf("wallet not found: %w", err)
	}

	updates := map[string]any{}
	if effect.AvailableDelta != 0 {
		updates["available_balance"] = gorm.Expr("available_balance + ?", float64(effect.AvailableDelta)*req.Amount)
	}
	if effect.PendingDelta != 0 {
		updates["pending_withdrawals"] = gorm.Expr("pending_withdrawals + ?", float64(effect.PendingDelta)*req.Amount)
	}
	if effect.TotalWithdrawnDelta != 0 {
		updates["total_withdrawn"] = gorm.Expr("total_withdrawn + ?", float64(effect.TotalWithdrawnDelta)*req.Amount)
	}
	if len(updates) > 0 {
		if err := tx.Model(&domain.Wallet{}).Where("id = ?", wallet.ID).Updates(updates).Error; err != nil {
			return fmt.Errorf("wallet update: %w", err)
		}
	}

	if effect.LedgerRow == "" {
		return nil
	}

	delta := float64(effect.AvailableDelta) * req.Amount
	entry := &domain.WalletTransaction{
		WalletID:          req.WalletID,
		Type:              effect.LedgerRow,
		TypeDescription:   ledgerDescription(effect.LedgerRow),
		Amount:            req.Amount,
		Reference:         req.Reference,
		ExternalReference: result.TransferCode,
		BalanceBefore:     wallet.AvailableBalance,
		BalanceAfter:      wallet.AvailableBalance + delta,
		// `completed` is now truthful: this row is only written from a verified
		// provider outcome, never from an admin pressing approve.
		Status:      "completed",
		GrossAmount: req.Amount,
		PlatformFee: 0, // 0% commission at launch; recorded so history is exact
		SellerNet:   req.Amount,
	}
	// The partial unique index on (reference, type) is the backstop if two
	// deliveries somehow reach here; the guarded UPDATE above should mean they
	// cannot.
	return tx.Create(entry).Error
}

func ledgerDescription(rowType string) string {
	if rowType == domain.LedgerRowWithdrawalReversal {
		return "Payout reversed by the bank"
	}
	return "Payout sent"
}

func truncateReason(s string) string {
	const max = 500
	if len(s) > max {
		return s[:max]
	}
	return s
}

// ── Reconciliation ────────────────────────────────────────────────────────
//
// Everything above is best-effort in one direction only: it never releases
// funds it is unsure about. That is safe but incomplete — it leaves withdrawals
// sitting in `processing`. This is what resolves them, and it is the reason the
// reference is committed before the network call.

// ReconcileStuckTransfers asks Paystack about every withdrawal still awaiting a
// verdict, and applies whatever it learns through the same `Finalize` the
// webhook uses.
//
// It covers three situations that look identical in the database and need
// different answers:
//
//   - the transfer exists and has moved on — apply its status;
//   - the transfer was never created, because the process died between claiming
//     the withdrawal and sending the request — re-initiate with the SAME
//     reference, which is a no-op at Paystack if it did arrive after all;
//   - Paystack is still unreachable — change nothing, try next run.
func (s *PayoutService) ReconcileStuckTransfers(olderThan time.Duration) (checked int, err error) {
	cutoff := time.Now().Add(-olderThan)

	var stuck []domain.WithdrawalRequest
	if err := s.db.
		Where("status IN ?", []string{
			string(domain.WithdrawalProcessing),
			string(domain.WithdrawalAwaitingOTP),
		}).
		Where("processing_at IS NULL OR processing_at < ?", cutoff).
		Limit(100).
		Find(&stuck).Error; err != nil {
		return 0, err
	}

	for i := range stuck {
		req := &stuck[i]
		if req.ProviderReference == "" {
			// Claimed by an older build that had no reference column. It cannot
			// be verified, so it needs a human rather than a guess.
			_ = s.escalate(req, "claimed without a provider reference")
			continue
		}
		checked++
		s.reconcileOne(req)
	}
	return checked, nil
}

func (s *PayoutService) reconcileOne(req *domain.WithdrawalRequest) {
	result := s.transfer.VerifyTransfer(req.ProviderReference)
	current := domain.WithdrawalStatus(req.Status)

	switch result.Outcome {
	case payments.TransferAccepted:
		next, ok := domain.NextStatusFor(current, result.Status)
		if !ok {
			s.bumpAttempt(req, fmt.Sprintf("unrecognised status %q", result.Status))
			return
		}
		if next == current {
			if current == domain.WithdrawalAwaitingOTP {
				// `pending` resolves itself; `otp` does not. Paystack is
				// waiting for someone to confirm the transfer on the account,
				// and nothing this process does will move it. Returning early
				// here meant an OTP-enabled account stranded the payout AND
				// the seller's reservation forever, because attempt_count
				// never grew and escalation never fired.
				s.bumpAttempt(req, "awaiting OTP confirmation on the Paystack account — "+
					"disable 'confirm transfers before sending', or confirm it manually")
				return
			}
			// Still in flight. Deliberately NOT an attempt: a transfer
			// legitimately sitting at `pending` must not burn the retry budget
			// and end up escalated.
			return
		}
		_ = s.applyTransition(req.ID, current, next, result)

	case payments.TransferNotFound:
		// The claim committed but the request never reached Paystack. Safe to
		// send again: same reference, so if it DID arrive this is a no-op there.
		s.retryInitiation(req)

	case payments.TransferDefinitivelyRejected:
		_ = s.applyTransition(req.ID, current, domain.WithdrawalFailed, result)

	default: // ambiguous
		s.bumpAttempt(req, result.Reason)
	}
}

// retryInitiation re-sends a transfer that Paystack never received, reusing the
// original reference so the operation stays idempotent end to end.
func (s *PayoutService) retryInitiation(req *domain.WithdrawalRequest) {
	if !PayoutsLive() {
		// The kill switch stops NEW money leaving; it must not stop us finding
		// out what happened to money already in flight. Verification and
		// webhooks keep resolving existing transfers either way — only this,
		// the one step that actually sends, is gated.
		s.bumpAttempt(req, "not re-sent: payouts are disabled")
		return
	}
	if req.AttemptCount >= maxTransferAttempts {
		_ = s.escalate(req, fmt.Sprintf("not created after %d attempts", req.AttemptCount))
		return
	}

	var account domain.BusinessBankAccountDetail
	if err := s.db.Where("id = ?", req.BankAccountDetailsID).First(&account).Error; err != nil {
		_ = s.escalate(req, "bank account missing")
		return
	}
	if err := s.ensureRecipient(&account); err != nil {
		// Same reasoning as the approval path: nothing has been sent, and
		// `TransferNotFound` is what got us here, so the reservation goes back.
		_ = s.applyTransition(req.ID, domain.WithdrawalStatus(req.Status), domain.WithdrawalFailed,
			payments.TransferResult{
				Outcome: payments.TransferDefinitivelyRejected,
				Reason:  "could not register payout account with Paystack: " + err.Error(),
			})
		return
	}

	if err := s.db.Model(&domain.WithdrawalRequest{}).
		Where("id = ?", req.ID).
		Update("attempt_count", gorm.Expr("attempt_count + 1")).Error; err != nil {
		return
	}
	req.AttemptCount++

	result := s.transfer.InitiateTransfer(payments.InitiateTransferInput{
		Account:   &account,
		Amount:    req.Amount,
		Reason:    "Vibaar seller payout",
		Reference: req.ProviderReference,
	})
	_ = s.recordInitiation(req, result)
}

// bumpAttempt records another inconclusive round and escalates once the budget
// is gone. Escalation still holds the reservation — `needs_review` means "we do
// not know", and not knowing must never release money.
func (s *PayoutService) bumpAttempt(req *domain.WithdrawalRequest, reason string) {
	if req.AttemptCount+1 >= maxTransferAttempts {
		_ = s.escalate(req, reason)
		return
	}
	_ = s.db.Model(&domain.WithdrawalRequest{}).
		Where("id = ?", req.ID).
		Updates(map[string]any{
			"attempt_count":  gorm.Expr("attempt_count + 1"),
			"failure_reason": truncateReason(reason),
		}).Error
}

func (s *PayoutService) escalate(req *domain.WithdrawalRequest, reason string) error {
	return s.applyTransition(req.ID, domain.WithdrawalStatus(req.Status), domain.WithdrawalNeedsReview,
		payments.TransferResult{Reason: "needs review: " + reason})
}
