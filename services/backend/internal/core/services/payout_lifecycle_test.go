package services

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/payments"
)

// The payout lifecycle, exercised end to end against a real (in-memory)
// database, because every property worth testing here is about what is DURABLE
// after a failure — not about what a function returns.

type fakeTransfer struct {
	mu        sync.Mutex
	initiated []payments.InitiateTransferInput
	onInit    func(payments.InitiateTransferInput) payments.TransferResult
	onVerify  func(string) payments.TransferResult
}

func (f *fakeTransfer) InitiateTransfer(in payments.InitiateTransferInput) payments.TransferResult {
	f.mu.Lock()
	f.initiated = append(f.initiated, in)
	f.mu.Unlock()
	if f.onInit != nil {
		return f.onInit(in)
	}
	return payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferPending, TransferCode: "TRF_ok", Reference: in.Reference}
}

func (f *fakeTransfer) VerifyTransfer(ref string) payments.TransferResult {
	if f.onVerify != nil {
		return f.onVerify(ref)
	}
	return payments.TransferResult{Outcome: payments.TransferAmbiguous, Reference: ref}
}

func (f *fakeTransfer) EnsureTransferRecipient(*domain.BusinessBankAccountDetail) (string, error) {
	return "RCP_test", nil
}

func (f *fakeTransfer) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.initiated)
}

type payoutFixture struct {
	db         *gorm.DB
	svc        *PayoutService
	transfer   *fakeTransfer
	walletID   string
	reqID      string
	amount     float64
	isPostgres bool

	notifyMu sync.Mutex
	notified []sentNotification
}

type sentNotification struct {
	event  string
	userID string
	vars   map[string]string
}

const (
	startingAvailable = 10000.0
	startingPending   = 1000.0
	payoutAmount      = 1000.0
)

var dbCounter atomic.Int64

// openTestDB opens a database for one test, and reports whether it is Postgres.
//
// Postgres when TEST_DATABASE_DSN is set, and that is the configuration these
// tests are WRITTEN for. Two of the guarantees under test exist only there:
//
//   - the partial UNIQUE indexes from migration 015 — on
//     `withdrawal_requests (provider_reference)` and on
//     `wallet_transactions (reference, type)` — which are raw SQL, not GORM
//     tags, so they are absent from an AutoMigrated sqlite schema;
//   - `RowsAffected` on a guarded UPDATE with genuinely concurrent writers,
//     which needs a connection pool of more than one.
//
// sqlite is the fallback so the suite still runs with no database configured,
// and the tests that cannot mean anything there skip LOUDLY rather than
// reporting a pass they did not earn.
func openTestDB(t *testing.T) (*gorm.DB, bool) {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		// A bare `:memory:` gives every pooled CONNECTION its own empty
		// database, so a second goroutine reports "no such table: wallets".
		// A named shared-cache database is shared across connections in the
		// process; the name is unique per test so they never collide.
		name := fmt.Sprintf("payout_test_%d", dbCounter.Add(1))
		db, err := gorm.Open(
			sqlite.Open("file:"+name+"?mode=memory&cache=shared"),
			&gorm.Config{Logger: logger.Discard},
		)
		if err != nil {
			t.Fatalf("open sqlite: %v", err)
		}
		sqlDB, err := db.DB()
		if err != nil {
			t.Fatalf("sql handle: %v", err)
		}
		// Shared-cache sqlite returns SQLITE_BUSY on concurrent writers rather
		// than queueing, which would show up as flake rather than as a finding.
		sqlDB.SetMaxOpenConns(1)
		// Keep the one connection alive: the in-memory database is destroyed
		// when the last handle to it closes.
		sqlDB.SetConnMaxIdleTime(0)
		t.Cleanup(func() { _ = sqlDB.Close() })
		migrateTestSchema(t, db, false)
		return db, false
	}

	// A schema private to this test, so tests never collide with each other or
	// with anything else in the database.
	schema := fmt.Sprintf("payout_test_%d_%d", os.Getpid(), dbCounter.Add(1))
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if err := admin.Exec("CREATE SCHEMA " + schema).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		admin.Exec("DROP SCHEMA " + schema + " CASCADE")
		if sqlDB, err := admin.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	// `search_path` goes in the DSN rather than a `SET` statement on purpose.
	// `SET search_path` binds to ONE pooled connection, so the concurrency test
	// — the one test that deliberately uses several — would find the tables on
	// one goroutine and not on the next.
	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	db, err := gorm.Open(postgres.Open(dsn+sep+"search_path="+schema), &gorm.Config{
		// Same as database.ConnectDB: without it AutoMigrate orders tables by
		// declaration and trips over forward FK references.
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Discard,
	})
	if err != nil {
		t.Fatalf("connect (scoped): %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	migrateTestSchema(t, db, true)
	return db, true
}

func migrateTestSchema(t *testing.T, db *gorm.DB, isPostgres bool) {
	t.Helper()
	if err := db.AutoMigrate(&domain.Wallet{}, &domain.WalletTransaction{},
		&domain.WithdrawalRequest{}, &domain.BusinessBankAccountDetail{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if !isPostgres {
		return
	}
	// Run the REAL migration rather than a hand-copied set of indexes, so the
	// constraints under test cannot drift from the ones that ship. 015 touches
	// only the three tables above, and every statement is `IF NOT EXISTS`.
	path := "../../migration/sql/015_payout_lifecycle.sql"
	sqlText, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	if err := db.Exec(string(sqlText)).Error; err != nil {
		t.Fatalf("apply 015: %v", err)
	}
	for _, index := range []string{
		"withdrawal_requests_provider_reference_key",
		"wallet_transactions_payout_reference_key",
	} {
		var n int64
		db.Raw("SELECT count(*) FROM pg_indexes WHERE schemaname = current_schema() AND indexname = ?", index).Scan(&n)
		if n != 1 {
			t.Fatalf("migration 015 did not create %s; the idempotency guarantee is not under test", index)
		}
	}
}

func newPayoutFixture(t *testing.T) *payoutFixture {
	t.Helper()
	t.Setenv("PAYOUTS_LIVE", "true")

	db, isPostgres := openTestDB(t)

	wallet := &domain.Wallet{
		UserID: "user-1", BusinessID: "biz-1",
		AvailableBalance: startingAvailable, PendingWithdrawals: startingPending,
	}
	if err := db.Create(wallet).Error; err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
	account := &domain.BusinessBankAccountDetail{
		BusinessID: "biz-1", Bank: "Test Bank", AccountNumber: "0123456789",
		AccountName: "Test Seller", BankCode: 58, PaystackRecipientCode: "RCP_test",
	}
	if err := db.Create(account).Error; err != nil {
		t.Fatalf("seed account: %v", err)
	}
	req := &domain.WithdrawalRequest{
		UserID: "user-1", WalletID: wallet.ID, Amount: payoutAmount,
		Status: string(domain.WithdrawalRequested), Reference: "INS-internal-1",
		BankAccountDetailsID: account.ID,
	}
	if err := db.Create(req).Error; err != nil {
		t.Fatalf("seed request: %v", err)
	}

	f := &fakeTransfer{}
	fixture := &payoutFixture{
		db: db, transfer: f,
		walletID: wallet.ID, reqID: req.ID, amount: payoutAmount,
		isPostgres: isPostgres,
	}
	fixture.svc = NewPayoutService(db, f, func(event, userID string, vars map[string]string) {
		fixture.notifyMu.Lock()
		defer fixture.notifyMu.Unlock()
		fixture.notified = append(fixture.notified, sentNotification{event, userID, vars})
	})
	return fixture
}

func (f *payoutFixture) sent(t *testing.T) []sentNotification {
	t.Helper()
	f.notifyMu.Lock()
	defer f.notifyMu.Unlock()
	return append([]sentNotification(nil), f.notified...)
}

func (f *payoutFixture) wallet(t *testing.T) domain.Wallet {
	t.Helper()
	var w domain.Wallet
	if err := f.db.Where("id = ?", f.walletID).First(&w).Error; err != nil {
		t.Fatalf("read wallet: %v", err)
	}
	return w
}

func (f *payoutFixture) request(t *testing.T) domain.WithdrawalRequest {
	t.Helper()
	var r domain.WithdrawalRequest
	if err := f.db.Where("id = ?", f.reqID).First(&r).Error; err != nil {
		t.Fatalf("read request: %v", err)
	}
	return r
}

func (f *payoutFixture) ledgerRows(t *testing.T, rowType string) int64 {
	t.Helper()
	var n int64
	f.db.Model(&domain.WalletTransaction{}).
		Where("wallet_id = ? AND type = ?", f.walletID, rowType).Count(&n)
	return n
}

func (f *payoutFixture) assertWallet(t *testing.T, available, pending, withdrawn float64, why string) {
	t.Helper()
	w := f.wallet(t)
	if w.AvailableBalance != available || w.PendingWithdrawals != pending || w.TotalWithdrawn != withdrawn {
		t.Errorf("%s\n  got  available=%.2f pending=%.2f withdrawn=%.2f\n  want available=%.2f pending=%.2f withdrawn=%.2f",
			why, w.AvailableBalance, w.PendingWithdrawals, w.TotalWithdrawn, available, pending, withdrawn)
	}
	if w.PendingWithdrawals < 0 {
		t.Errorf("%s: pending_withdrawals went NEGATIVE (%.2f) — effective balance is "+
			"available-pending, so this hands the seller money that does not exist",
			why, w.PendingWithdrawals)
	}
}

// ── 1. Ambiguous responses ────────────────────────────────────────────────
//
// The reservation is the assertion. Releasing it on a timeout returns the funds
// to `available` while a real transfer may be in flight at Paystack, and the
// seller can then withdraw the same money twice.
func TestAmbiguousOutcome_HoldsTheReservation(t *testing.T) {
	ambiguous := []struct {
		name   string
		result payments.TransferResult
	}{
		{"timeout", payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "context deadline exceeded"}},
		{"connection reset", payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "connection reset by peer"}},
		{"500", payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "paystack returned 500"}},
		{"502", payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "paystack returned 502"}},
		{"unparseable body", payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "unparseable response"}},
		{"unknown status", payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: `unrecognised transfer status "queued"`}},
	}

	for _, c := range ambiguous {
		t.Run(c.name, func(t *testing.T) {
			f := newPayoutFixture(t)
			f.transfer.onInit = func(payments.InitiateTransferInput) payments.TransferResult { return c.result }

			if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
				t.Fatalf("approve: %v", err)
			}

			if got := domain.WithdrawalStatus(f.request(t).Status); got != domain.WithdrawalProcessing {
				t.Errorf("status = %q, want processing — an unknown outcome is not a verdict", got)
			}
			f.assertWallet(t, startingAvailable, startingPending, 0,
				"an ambiguous outcome must move no money and must NOT release the reservation")
			if n := f.ledgerRows(t, domain.LedgerRowWithdrawal); n != 0 {
				t.Errorf("wrote %d ledger rows for an unconfirmed transfer", n)
			}
		})
	}
}

// Only a definitive refusal returns the funds.
func TestDefinitiveRejection_ReleasesTheReservation(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferDefinitivelyRejected, Reason: "Insufficient balance"}
	}

	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	req := f.request(t)
	if domain.WithdrawalStatus(req.Status) != domain.WithdrawalFailed {
		t.Errorf("status = %q, want failed", req.Status)
	}
	if req.FailureReason == "" {
		t.Error("a failure must record why, or an operator cannot act on it")
	}
	f.assertWallet(t, startingAvailable, startingPending-payoutAmount, 0,
		"a definitive rejection returns the reservation and nothing else")
}

// ── 5. Paid → reversed accounting ─────────────────────────────────────────
//
// The transition that, done wrong, creates money.
func TestPaidThenReversed_CompensatesWithoutTouchingTheReservation(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(in payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferPending, TransferCode: "TRF_rev", Reference: in.Reference}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}

	ref := f.request(t).ProviderReference
	success := payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, TransferCode: "TRF_rev", Reference: ref}
	if err := f.svc.Finalize(ref, success, domain.WithdrawalPaid); err != nil {
		t.Fatalf("finalize paid: %v", err)
	}
	f.assertWallet(t, startingAvailable-payoutAmount, startingPending-payoutAmount, payoutAmount,
		"a verified success debits available, consumes the reservation and counts the withdrawal")

	// Now the money comes back.
	reversal := payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferReversed, TransferCode: "TRF_rev", Reference: ref}
	if err := f.svc.Finalize(ref, reversal, domain.WithdrawalReversed); err != nil {
		t.Fatalf("finalize reversed: %v", err)
	}

	// available is restored; total_withdrawn is undone; pending is UNTOUCHED,
	// because the reservation was consumed at `paid` and no longer exists.
	f.assertWallet(t, startingAvailable, startingPending-payoutAmount, 0,
		"a reversal after payment credits the seller back and must NOT unlock a "+
			"reservation that was already consumed")

	if n := f.ledgerRows(t, domain.LedgerRowWithdrawal); n != 1 {
		t.Errorf("withdrawal ledger rows = %d, want 1 — the original entry stays", n)
	}
	if n := f.ledgerRows(t, domain.LedgerRowWithdrawalReversal); n != 1 {
		t.Errorf("reversal ledger rows = %d, want 1 — the ledger is append-only", n)
	}
}

// A reversal BEFORE payment is a different event: nothing was paid, so there is
// nothing to compensate and the reservation simply goes back.
func TestReversedBeforePayment_ReleasesRatherThanCredits(t *testing.T) {
	f := newPayoutFixture(t)
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	ref := f.request(t).ProviderReference

	next, ok := domain.NextStatusFor(domain.WithdrawalProcessing, domain.PaystackTransferReversed)
	if !ok || next != domain.WithdrawalFailed {
		t.Fatalf("processing + reversed resolved to %q, want failed", next)
	}
	if err := f.svc.Finalize(ref, payments.TransferResult{
		Outcome: payments.TransferAccepted, Status: domain.PaystackTransferReversed, Reference: ref,
	}, next); err != nil {
		t.Fatalf("finalize: %v", err)
	}
	f.assertWallet(t, startingAvailable, startingPending-payoutAmount, 0,
		"a reversal with no payment behind it is a failure, not a credit")
}

// ── 4. Repeated webhooks ──────────────────────────────────────────────────
func TestRepeatedWebhooks_MoveTheLedgerOnce(t *testing.T) {
	f := newPayoutFixture(t)
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	ref := f.request(t).ProviderReference
	success := payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, TransferCode: "TRF_dup", Reference: ref}

	// Paystack delivers at least once.
	for i := 0; i < 3; i++ {
		if err := f.svc.Finalize(ref, success, domain.WithdrawalPaid); err != nil {
			t.Fatalf("delivery %d: %v", i+1, err)
		}
	}

	f.assertWallet(t, startingAvailable-payoutAmount, startingPending-payoutAmount, payoutAmount,
		"three deliveries of the same success must debit once")
	if n := f.ledgerRows(t, domain.LedgerRowWithdrawal); n != 1 {
		t.Errorf("ledger rows = %d, want 1", n)
	}
}

// A late `failed` after a `success` must not un-pay the seller. The guarded
// transition refuses it because `paid -> failed` is not in the matrix.
func TestLateFailureAfterSuccess_IsRefused(t *testing.T) {
	f := newPayoutFixture(t)
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	ref := f.request(t).ProviderReference
	_ = f.svc.Finalize(ref, payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, Reference: ref}, domain.WithdrawalPaid)

	err := f.svc.Finalize(ref, payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferFailed, Reference: ref}, domain.WithdrawalFailed)
	if err == nil {
		t.Error("paid -> failed was accepted; it must be refused as an illegal transition")
	}
	f.assertWallet(t, startingAvailable-payoutAmount, startingPending-payoutAmount, payoutAmount,
		"a late failure must not disturb a completed payout")
}

// ── 3. Duplicate initiation ───────────────────────────────────────────────
func TestConcurrentApprovals_InitiateExactlyOneTransfer(t *testing.T) {
	f := newPayoutFixture(t)
	if !f.isPostgres {
		// Skipping rather than passing. The sqlite fixture runs on a single
		// connection, so these goroutines would be serialised by the pool
		// before they ever reached the database — the test would go green
		// without a race having happened, which is worse than no test.
		t.Skip("needs TEST_DATABASE_DSN: a real race needs more than one connection")
	}

	// Two things make this a real race rather than six goroutines that happen
	// to run one after another.
	//
	// The barrier parks every goroutine until all of them are ready, so they
	// enter the claim together instead of trickling in.
	//
	// The delay widens the window between reading the status and writing it.
	// Without it the claim transaction is a few hundred microseconds long and
	// the goroutines miss each other — measured: with both database guards
	// REMOVED and only the in-Go status check left (the TOCTOU bug a reasonable
	// person would write), the barrier alone still reported one winner, because
	// the first claim had committed before the second one read. With the delay
	// the same mutation reports six winners and six transfers, which is what
	// this test has to be able to see.
	delayClaimUpdates(t, f.db, 60*time.Millisecond)

	const attempts = 6
	var ready, done sync.WaitGroup
	start := make(chan struct{})
	errs := make([]error, attempts)
	ready.Add(attempts)
	done.Add(attempts)
	for i := 0; i < attempts; i++ {
		go func(i int) {
			defer done.Done()
			ready.Done()
			<-start
			errs[i] = f.svc.ApproveAndTransfer(f.reqID)
		}(i)
	}
	ready.Wait()
	close(start)
	done.Wait()

	var won int
	for _, err := range errs {
		if err == nil {
			won++
		}
	}
	if won != 1 {
		t.Errorf("%d approvals succeeded, want exactly 1 — the guarded claim is the "+
			"only thing standing between two admins and two real transfers", won)
	}

	if n := f.transfer.count(); n != 1 {
		t.Errorf("%d transfers initiated, want 1", n)
	}
	f.assertWallet(t, startingAvailable, startingPending, 0, "claiming moves no money")
}

// ── 2. Crash recovery ─────────────────────────────────────────────────────
//
// Simulates the process dying between committing the claim and Paystack
// receiving the request: the row is `processing` with a reference and no
// transfer code, which is indistinguishable from a timeout.
func TestCrashAfterClaim_ReconcilerRetriesWithTheSameReference(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "process died"}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	firstRef := f.request(t).ProviderReference
	if firstRef == "" {
		t.Fatal("no reference was persisted before the call; a crash would be unrecoverable")
	}

	// Paystack never received it.
	f.transfer.onVerify = func(ref string) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferNotFound, Reference: ref}
	}
	f.transfer.onInit = func(in payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, TransferCode: "TRF_retry", Reference: in.Reference}
	}

	if _, err := f.svc.ReconcileStuckTransfers(0); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	// The retry must reuse the ORIGINAL reference — that is what makes it a
	// no-op at Paystack if the first request did arrive after all.
	f.transfer.mu.Lock()
	last := f.transfer.initiated[len(f.transfer.initiated)-1]
	f.transfer.mu.Unlock()
	if last.Reference != firstRef {
		t.Errorf("retry used reference %q, want the original %q — a new reference "+
			"would create a SECOND real transfer", last.Reference, firstRef)
	}

	if got := domain.WithdrawalStatus(f.request(t).Status); got != domain.WithdrawalPaid {
		t.Errorf("status = %q, want paid after a successful retry", got)
	}
	f.assertWallet(t, startingAvailable-payoutAmount, startingPending-payoutAmount, payoutAmount,
		"the recovered payout settles exactly once")
	if n := f.ledgerRows(t, domain.LedgerRowWithdrawal); n != 1 {
		t.Errorf("ledger rows = %d, want 1", n)
	}
}

// A transfer that DID reach Paystack is settled from its real status rather
// than re-sent.
func TestReconciler_SettlesFromVerification(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "timeout"}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	before := f.transfer.count()

	f.transfer.onVerify = func(ref string) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, TransferCode: "TRF_v", Reference: ref}
	}
	if _, err := f.svc.ReconcileStuckTransfers(0); err != nil {
		t.Fatalf("reconcile: %v", err)
	}

	if f.transfer.count() != before {
		t.Error("the reconciler re-sent a transfer that already existed at Paystack")
	}
	if got := domain.WithdrawalStatus(f.request(t).Status); got != domain.WithdrawalPaid {
		t.Errorf("status = %q, want paid", got)
	}
	f.assertWallet(t, startingAvailable-payoutAmount, startingPending-payoutAmount, payoutAmount,
		"verification settles the payout exactly once")
}

// Repeatedly inconclusive verification escalates, and escalation HOLDS the
// reservation — "we do not know" must never release money.
func TestReconciler_EscalatesWithoutReleasingFunds(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAmbiguous, Reason: "timeout"}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	f.transfer.onVerify = func(ref string) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAmbiguous, Reference: ref, Reason: "still unreachable"}
	}

	for i := 0; i < maxTransferAttempts+2; i++ {
		if _, err := f.svc.ReconcileStuckTransfers(0); err != nil {
			t.Fatalf("reconcile %d: %v", i, err)
		}
	}

	if got := domain.WithdrawalStatus(f.request(t).Status); got != domain.WithdrawalNeedsReview {
		t.Errorf("status = %q, want needs_review after the retry budget is spent", got)
	}
	f.assertWallet(t, startingAvailable, startingPending, 0,
		"an unresolved payout keeps its reservation held for a human to settle")
}

// ── 7. Disabled means disabled ────────────────────────────────────────────
func TestPayoutsDisabled_RefusesWithoutAnyStateChange(t *testing.T) {
	f := newPayoutFixture(t)
	t.Setenv("PAYOUTS_LIVE", "false")

	err := f.svc.ApproveAndTransfer(f.reqID)
	if err == nil {
		t.Fatal("approval succeeded while payouts are disabled")
	}
	if got := domain.WithdrawalStatus(f.request(t).Status); got != domain.WithdrawalRequested {
		t.Errorf("status = %q, want requested — a system that cannot pay must not "+
			"record that it did", got)
	}
	if f.transfer.count() != 0 {
		t.Error("a transfer was attempted while payouts are disabled")
	}
	f.assertWallet(t, startingAvailable, startingPending, 0, "nothing may move")
}

// The default must be off. A payout system that enables itself because an
// environment variable is absent fails in the direction that moves money.
func TestPayoutsLive_DefaultsToOff(t *testing.T) {
	t.Setenv("PAYOUTS_LIVE", "")
	if PayoutsLive() {
		t.Error("payouts are live with PAYOUTS_LIVE unset; the default must be off")
	}
	for _, v := range []string{"true", "TRUE", " true "} {
		t.Setenv("PAYOUTS_LIVE", v)
		if !PayoutsLive() {
			t.Errorf("PAYOUTS_LIVE=%q did not enable payouts", v)
		}
	}
	for _, v := range []string{"1", "yes", "on"} {
		t.Setenv("PAYOUTS_LIVE", v)
		if PayoutsLive() {
			t.Errorf("PAYOUTS_LIVE=%q enabled payouts; only an explicit `true` should", v)
		}
	}
}

// `otp` is a live transfer awaiting confirmation, not a failure.
func TestOTPStatus_KeepsTheReservationAndStaysOpen(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(in payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferOTP, TransferCode: "TRF_otp", Reference: in.Reference}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	if got := domain.WithdrawalStatus(f.request(t).Status); got != domain.WithdrawalAwaitingOTP {
		t.Errorf("status = %q, want awaiting_otp", got)
	}
	f.assertWallet(t, startingAvailable, startingPending, 0,
		"a transfer awaiting OTP is still going to happen; nothing is released")

	// And it still settles when confirmed.
	ref := f.request(t).ProviderReference
	if err := f.svc.Finalize(ref, payments.TransferResult{
		Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, Reference: ref,
	}, domain.WithdrawalPaid); err != nil {
		t.Fatalf("finalize: %v", err)
	}
	f.assertWallet(t, startingAvailable-payoutAmount, startingPending-payoutAmount, payoutAmount,
		"an OTP transfer that succeeds settles normally")
}

// The ledger row must carry the split, so a statement printed later is exact
// rather than recomputed from whatever the commission happens to be then.
func TestLedgerRowRecordsTheSplit(t *testing.T) {
	f := newPayoutFixture(t)
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	ref := f.request(t).ProviderReference
	if err := f.svc.Finalize(ref, payments.TransferResult{
		Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess,
		TransferCode: "TRF_split", Reference: ref, Fee: 10.5,
	}, domain.WithdrawalPaid); err != nil {
		t.Fatalf("finalize: %v", err)
	}

	var entry domain.WalletTransaction
	if err := f.db.Where("type = ?", domain.LedgerRowWithdrawal).First(&entry).Error; err != nil {
		t.Fatalf("no ledger row: %v", err)
	}
	if entry.GrossAmount != payoutAmount || entry.PlatformFee != 0 || entry.SellerNet != payoutAmount {
		t.Errorf("split = gross %.2f / fee %.2f / net %.2f, want %.2f / 0 / %.2f (0%% commission at launch)",
			entry.GrossAmount, entry.PlatformFee, entry.SellerNet, payoutAmount, payoutAmount)
	}
	if entry.ExternalReference != "TRF_split" {
		t.Errorf("ExternalReference = %q, want the Paystack transfer code", entry.ExternalReference)
	}
	if req := f.request(t); req.TransferFee != 10.5 {
		t.Errorf("TransferFee = %v, want 10.5 — Vibaar absorbs it, but it is recorded", req.TransferFee)
	}
	// The fee is absorbed: the seller still receives the full amount.
	if entry.SellerNet != payoutAmount {
		t.Errorf("the transfer fee reduced the seller's net; Vibaar absorbs it")
	}
}

func TestReconciler_IgnoresFreshTransfers(t *testing.T) {
	f := newPayoutFixture(t)
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	checked, err := f.svc.ReconcileStuckTransfers(time.Hour)
	if err != nil {
		t.Fatalf("reconcile: %v", err)
	}
	if checked != 0 {
		t.Errorf("checked %d fresh transfers; they should be left to settle on their own", checked)
	}
}

// delayClaimUpdates widens the read-then-write window inside the claim
// transaction, so a missing guard shows up as a wrong result rather than as a
// test that is merely lucky.
//
// It hooks the status write specifically. Registering a blanket delay on every
// UPDATE would slow the seeding and the ledger writes too, and — worse — would
// hold the wallet row lock open, which is a different race from the one under
// test.
func delayClaimUpdates(t *testing.T, db *gorm.DB, d time.Duration) {
	t.Helper()
	const name = "test:delay_claim"
	err := db.Callback().Update().Before("gorm:update").Register(name, func(tx *gorm.DB) {
		if tx.Statement == nil || tx.Statement.Table != "withdrawal_requests" {
			return
		}
		dest, ok := tx.Statement.Dest.(map[string]any)
		if !ok {
			return
		}
		if status, ok := dest["status"].(string); ok && status == string(domain.WithdrawalProcessing) {
			time.Sleep(d)
		}
	})
	if err != nil {
		t.Fatalf("register callback: %v", err)
	}
	t.Cleanup(func() { _ = db.Callback().Update().Remove(name) })
}

// ── Notification copy ─────────────────────────────────────────────────────
//
// `renderVars` leaves an unrecognised placeholder INTACT on purpose, so a
// missing variable is visible rather than silently blank. That choice is right
// for QA and unforgiving in production: the seller reads the literal text
// "Sent to your {{bank}}." — on WhatsApp, about their money.
//
// The payout service is the only producer of these five events, so the set of
// placeholders in the registry and the set of variables it passes have to match
// exactly, and nothing else checks that they do.
func TestPayoutNotificationsRenderWithNoPlaceholdersLeft(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(in payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferPending, TransferCode: "TRF_n", Reference: in.Reference}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	ref := f.request(t).ProviderReference
	paid := payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferSuccess, TransferCode: "TRF_n", Reference: ref}
	if err := f.svc.Finalize(ref, paid, domain.WithdrawalPaid); err != nil {
		t.Fatalf("finalize paid: %v", err)
	}
	reversed := payments.TransferResult{Outcome: payments.TransferAccepted, Status: domain.PaystackTransferReversed, TransferCode: "TRF_n", Reference: ref}
	if err := f.svc.Finalize(ref, reversed, domain.WithdrawalReversed); err != nil {
		t.Fatalf("finalize reversed: %v", err)
	}

	sent := f.sent(t)
	seen := map[string]bool{}
	for _, n := range sent {
		seen[n.event] = true

		def, ok := notifRegistry[n.event]
		if !ok {
			t.Errorf("%s is emitted but not in the registry, so the dispatcher drops it "+
				"and the seller is never told", n.event)
			continue
		}
		for _, text := range []string{renderVars(def.Title, n.vars), renderVars(def.Body, n.vars)} {
			if strings.Contains(text, "{{") {
				t.Errorf("%s renders with an unfilled placeholder: %q", n.event, text)
			}
		}
		if n.userID == "" {
			t.Errorf("%s was emitted with no recipient", n.event)
		}
		// An EMPTY value is not caught by the check above — `renderVars`
		// substitutes it happily and the seller reads "Sent to your ." So the
		// values are checked too, not just their presence.
		for key, value := range n.vars {
			if strings.TrimSpace(value) == "" {
				t.Errorf("%s passed an empty {{%s}}, which renders as a gap in the "+
					"sentence rather than as a visible placeholder", n.event, key)
			}
		}
	}

	for _, event := range []string{
		"seller.payout.withdrawal_processing",
		"seller.payout.withdrawal_sent",
		"seller.payout.withdrawal_reversed",
	} {
		if !seen[event] {
			t.Errorf("%s was never emitted for a payout that processed, paid and reversed", event)
		}
	}
}

// The failure path has its own copy and its own variables.
func TestFailedPayoutNotificationRenders(t *testing.T) {
	f := newPayoutFixture(t)
	f.transfer.onInit = func(payments.InitiateTransferInput) payments.TransferResult {
		return payments.TransferResult{Outcome: payments.TransferDefinitivelyRejected, Reason: "Insufficient balance"}
	}
	if err := f.svc.ApproveAndTransfer(f.reqID); err != nil {
		t.Fatalf("approve: %v", err)
	}
	var found bool
	for _, n := range f.sent(t) {
		if n.event != "seller.payout.withdrawal_failed" {
			continue
		}
		found = true
		def := notifRegistry[n.event]
		body := renderVars(def.Body, n.vars)
		if strings.Contains(body, "{{") {
			t.Errorf("failure copy renders with an unfilled placeholder: %q", body)
		}
	}
	if !found {
		t.Error("a seller whose withdrawal failed was told nothing")
	}
}

// The bank is named the way a seller recognises it, and the account number is
// not reproduced in full — this copy escalates to WhatsApp.
func TestBankLabel(t *testing.T) {
	cases := []struct {
		account *domain.BusinessBankAccountDetail
		want    string
	}{
		{&domain.BusinessBankAccountDetail{Bank: "GTBank", AccountNumber: "0123456789"}, "GTBank ••6789"},
		{&domain.BusinessBankAccountDetail{Bank: "  Kuda  ", AccountNumber: "2019384756"}, "Kuda ••4756"},
		{&domain.BusinessBankAccountDetail{Bank: "", AccountNumber: "0123456789"}, "bank account ••6789"},
		{&domain.BusinessBankAccountDetail{Bank: "Opay", AccountNumber: "12"}, "Opay"},
		{nil, "bank account"},
	}
	for _, c := range cases {
		if got := bankLabel(c.account); got != c.want {
			t.Errorf("bankLabel(%+v) = %q, want %q", c.account, got, c.want)
		}
	}
	full := "0123456789"
	if label := bankLabel(&domain.BusinessBankAccountDetail{Bank: "GTBank", AccountNumber: full}); strings.Contains(label, full) {
		t.Errorf("the full account number reached notification copy: %q", label)
	}
}

// ── Migration 015's partial unique indexes ────────────────────────────────
//
// These indexes are the idempotency guarantee, and the first version of them
// would have taken the platform down.
//
// `provider_reference` and `paystack_recipient_code` are Go `string` fields,
// not `*string`, so GORM writes ” — never NULL — for every row that has not
// reached the provider yet. A `WHERE col IS NOT NULL` predicate therefore
// indexes all of those rows under the same key, and the SECOND withdrawal
// request, or the second bank account, fails with a unique violation.
//
// Found by probing the live schema, not by reading the SQL.
func TestUnclaimedRowsDoNotCollideOnTheEmptyString(t *testing.T) {
	f := newPayoutFixture(t)
	if !f.isPostgres {
		t.Skip("needs TEST_DATABASE_DSN: these indexes are raw SQL from migration 015")
	}

	// A second withdrawal request, unclaimed exactly like the seeded one.
	second := &domain.WithdrawalRequest{
		UserID: "user-1", WalletID: f.walletID, Amount: 250,
		Status: string(domain.WithdrawalRequested), Reference: "INS-internal-2",
	}
	if err := f.db.Create(second).Error; err != nil {
		t.Fatalf("a second unclaimed withdrawal request was rejected — sellers could "+
			"not withdraw at all: %v", err)
	}
	third := &domain.WithdrawalRequest{
		UserID: "user-2", WalletID: f.walletID, Amount: 75,
		Status: string(domain.WithdrawalRequested), Reference: "INS-internal-3",
	}
	if err := f.db.Create(third).Error; err != nil {
		t.Fatalf("a third unclaimed withdrawal request was rejected: %v", err)
	}

	// A second bank account with no recipient code yet.
	other := &domain.BusinessBankAccountDetail{
		BusinessID: "biz-2", Bank: "Other Bank", AccountNumber: "9876543210",
		AccountName: "Other Seller", BankCode: 44,
	}
	if err := f.db.Create(other).Error; err != nil {
		t.Fatalf("a second bank account with no recipient was rejected — no seller "+
			"after the first could add payout details: %v", err)
	}

	// And the constraint still does its actual job.
	f.db.Model(&domain.WithdrawalRequest{}).Where("id = ?", second.ID).
		Update("provider_reference", "VBR-PO-DUPLICATE")
	err := f.db.Model(&domain.WithdrawalRequest{}).Where("id = ?", third.ID).
		Update("provider_reference", "VBR-PO-DUPLICATE").Error
	if err == nil {
		t.Error("two withdrawals took the SAME provider reference; the index that " +
			"makes Paystack deduplicate our retries is not enforcing anything")
	}
}

// Editing a payout bank account wrote a `bank_id` column that does not exist,
// so Postgres rejected the statement and every edit failed with "something went
// wrong" while the seller looked at correct details. The column is `bank_code`.
//
// The same statement now clears the cached Paystack recipient, because it
// identifies the OLD account at Paystack and reusing it would send the seller's
// money to the bank account they just replaced.
func TestEditingABankAccountSucceedsAndDropsTheStaleRecipient(t *testing.T) {
	f := newPayoutFixture(t)
	if !f.isPostgres {
		t.Skip("needs TEST_DATABASE_DSN: sqlite accepts columns Postgres rejects")
	}

	var account domain.BusinessBankAccountDetail
	if err := f.db.Where("business_id = ?", "biz-1").First(&account).Error; err != nil {
		t.Fatalf("seed account: %v", err)
	}
	if account.PaystackRecipientCode == "" {
		t.Fatal("fixture precondition: the account should start with a cached recipient")
	}

	repo := mysql_repo.NewBusinessRepository(f.db)
	err := repo.UpdateAccountDetails(account.ID, domain.BusinessBankAccountDetail{
		Bank: "New Bank", AccountNumber: "5555566666", AccountName: "Test Seller",
		BankCode: 999, IsDefault: true,
	})
	if err != nil {
		t.Fatalf("editing a payout bank account failed: %v", err)
	}

	var updated domain.BusinessBankAccountDetail
	if err := f.db.Where("id = ?", account.ID).First(&updated).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if updated.BankCode != 999 {
		t.Errorf("bank_code = %d, want 999 — the edit did not reach the column", updated.BankCode)
	}
	if updated.Bank != "New Bank" || updated.AccountNumber != "5555566666" {
		t.Errorf("account details were not updated: %+v", updated)
	}
	if updated.PaystackRecipientCode != "" {
		t.Errorf("the recipient code for the PREVIOUS account survived the edit (%q); "+
			"the next payout would pay the old bank account", updated.PaystackRecipientCode)
	}
}
