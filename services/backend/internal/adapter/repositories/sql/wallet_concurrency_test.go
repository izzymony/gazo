package mysql_repo

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

// The P0 money-safety guards, exercised against real Postgres.
//
// These need Postgres and say so instead of quietly passing on sqlite: what is
// under test is `SELECT ... FOR UPDATE` serialising real concurrent writers and
// `RowsAffected` on a guarded UPDATE. sqlite has a single writer and ignores
// row locks, so the same test there would pass no matter which way the
// repository was written — which is the definition of a test that pins nothing.

var walletDBCounter atomic.Int64

// openWalletPG opens a private schema on the configured test database, or skips
// loudly. Returns the DB and the business id of a seeded wallet.
func openWalletPG(t *testing.T, opening, clearing, available, pending float64) (*gorm.DB, string) {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — FOR UPDATE and RowsAffected under " +
			"genuine concurrency cannot be exercised on sqlite, and a green run " +
			"here would be meaningless")
	}

	schema := fmt.Sprintf("wallet_conc_%d_%d", os.Getpid(), walletDBCounter.Add(1))
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

	db, err := gorm.Open(postgres.Open(walletSearchPath(dsn, schema)), &gorm.Config{
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

	// Hand-rolled rather than AutoMigrated: domain.Wallet has a Business
	// association that would drag most of the schema in behind it.
	if err := db.Exec(`CREATE TABLE wallets (
		id text PRIMARY KEY,
		business_id text,
		orders_in_progress numeric DEFAULT 0,
		clearing_balance numeric DEFAULT 0,
		available_balance numeric DEFAULT 0,
		pending_withdrawals numeric DEFAULT 0,
		total_earnings numeric DEFAULT 0,
		total_withdrawn numeric DEFAULT 0,
		created_at timestamptz DEFAULT now(),
		updated_at timestamptz DEFAULT now()
	)`).Error; err != nil {
		t.Fatalf("create wallets: %v", err)
	}
	// wallet_transactions IS AutoMigrated, deliberately: it has no associations
	// to drag in, and hand-rolling it once already produced a green-looking
	// failure — the fixture was missing `external_reference` and every insert
	// died on a column the model has had all along. Letting GORM derive it from
	// the same struct the repository writes means the fixture cannot drift from
	// the model.
	if err := db.AutoMigrate(&domain.WalletTransaction{}); err != nil {
		t.Fatalf("migrate wallet_transactions: %v", err)
	}

	businessID := "biz-p0"
	if err := db.Exec(
		`INSERT INTO wallets (id, business_id, orders_in_progress, clearing_balance,
			available_balance, pending_withdrawals) VALUES (?, ?, ?, ?, ?, ?)`,
		"w-p0", businessID, opening, clearing, available, pending,
	).Error; err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
	return db, businessID
}

// See the long note on withSearchPath in payout_lifecycle_test.go: a URL DSN
// takes `?key=value` and a keyword DSN takes a space-separated `key=value`, and
// mixing them up is silent locally and fatal in CI.
func walletSearchPath(dsn, schema string) string {
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		sep := "?"
		if strings.Contains(dsn, "?") {
			sep = "&"
		}
		return dsn + sep + "search_path=" + schema
	}
	return strings.TrimSpace(dsn) + " search_path=" + schema
}

type walletRow struct {
	OrdersInProgress   float64
	ClearingBalance    float64
	AvailableBalance   float64
	PendingWithdrawals float64
}

func readWallet(t *testing.T, db *gorm.DB, businessID string) walletRow {
	t.Helper()
	var w walletRow
	if err := db.Raw(`SELECT orders_in_progress, clearing_balance, available_balance,
		pending_withdrawals FROM wallets WHERE business_id = ?`, businessID).Scan(&w).Error; err != nil {
		t.Fatalf("read wallet: %v", err)
	}
	return w
}

func ledgerRow(amount float64, ref string) *domain.WalletTransaction {
	return &domain.WalletTransaction{
		Type:      "clearing_balance_credit",
		Amount:    amount,
		Reference: ref,
		Status:    "completed",
	}
}

// G1, the reason P0 exists.
//
// MoveFunds read the wallet with an unlocked query, mutated the struct in Go,
// and `Save`d the whole row. Two deliveries settling at the same moment for one
// seller both read the same balances and the second write overwrote the first,
// so one credit vanished with no error anywhere.
//
// The START BARRIER is not decoration. Without it the goroutines run one after
// another, the defect never reproduces, and the test passes against the broken
// implementation — this project has already shipped three tests that passed
// vacuously.
func TestMoveFundsWithLedger_ConcurrentSettlementsBothLand(t *testing.T) {
	const (
		opening = 10000.0
		amount  = 500.0
		movers  = 8
	)
	db, businessID := openWalletPG(t, opening, 0, 0, 0)

	var start sync.WaitGroup
	start.Add(1)
	var done sync.WaitGroup
	errs := make(chan error, movers)

	for i := 0; i < movers; i++ {
		done.Add(1)
		go func(i int) {
			defer done.Done()
			start.Wait() // all goroutines released at once
			errs <- NewWalletRepository(db).MoveFundsWithLedger(
				businessID, "orders_in_progress", "clearing_balance", amount,
				ledgerRow(amount, fmt.Sprintf("ref-%d", i)),
			)
		}(i)
	}
	start.Done()
	done.Wait()
	close(errs)

	for err := range errs {
		if err != nil {
			t.Fatalf("a concurrent settlement failed: %v", err)
		}
	}

	got := readWallet(t, db, businessID)
	wantClearing := amount * movers
	if got.ClearingBalance != wantClearing {
		t.Errorf("clearing_balance = %.2f, want %.2f — %.0f naira of seller earnings "+
			"was lost to a lost update", got.ClearingBalance, wantClearing, wantClearing-got.ClearingBalance)
	}
	if got.OrdersInProgress != opening-wantClearing {
		t.Errorf("orders_in_progress = %.2f, want %.2f", got.OrdersInProgress, opening-wantClearing)
	}

	var rows int64
	db.Raw(`SELECT count(*) FROM wallet_transactions`).Scan(&rows)
	if rows != movers {
		t.Errorf("wrote %d ledger rows for %d moves — the ledger and the balance disagree", rows, movers)
	}
}

// The second half of G1, and the one a "do both credits land" test misses.
//
// A full-row `Save` rewrites EVERY balance column from a stale read, so a move
// could erase a reservation taken by a concurrent payout request — releasing
// funds that were committed to an in-flight transfer.
func TestMoveFundsWithLedger_DoesNotClobberAConcurrentReservation(t *testing.T) {
	const opening = 10000.0
	db, businessID := openWalletPG(t, opening, 0, 5000, 0)

	var start sync.WaitGroup
	start.Add(1)
	var done sync.WaitGroup
	done.Add(2)

	var moveErr, lockErr error
	go func() {
		defer done.Done()
		start.Wait()
		moveErr = NewWalletRepository(db).MoveFundsWithLedger(
			businessID, "orders_in_progress", "clearing_balance", 500, ledgerRow(500, "ref-move"))
	}()
	go func() {
		defer done.Done()
		start.Wait()
		lockErr = NewWalletRepository(db).LockBalance(businessID, 2000)
	}()
	start.Done()
	done.Wait()

	if moveErr != nil {
		t.Fatalf("move failed: %v", moveErr)
	}
	if lockErr != nil {
		t.Fatalf("reservation failed: %v", lockErr)
	}

	got := readWallet(t, db, businessID)
	if got.PendingWithdrawals != 2000 {
		t.Errorf("pending_withdrawals = %.2f, want 2000 — the settlement overwrote a "+
			"reservation held for an in-flight payout", got.PendingWithdrawals)
	}
	if got.ClearingBalance != 500 {
		t.Errorf("clearing_balance = %.2f, want 500 — the reservation overwrote the settlement",
			got.ClearingBalance)
	}
}

// G9: the move and its ledger row are one transaction. Previously the move
// committed and the row was a separate write afterwards, so a failure between
// them left money moved with nothing recording it.
func TestMoveFundsWithLedger_RollsBackTheMoveWhenTheLedgerRowFails(t *testing.T) {
	const opening = 1000.0
	db, businessID := openWalletPG(t, opening, 0, 0, 0)

	// Fail the ledger insert without touching the balance update. A duplicate
	// PRIMARY KEY looks like the obvious way and cannot work: domain.Model's
	// BeforeCreate hook overwrites ID with a fresh uuid unconditionally
	// (baseModel.go:112), so a caller-supplied id is silently discarded. A
	// unique index on `reference` is a constraint the repository's own insert
	// actually has to satisfy.
	if err := db.Exec(`CREATE UNIQUE INDEX wt_ref_uniq ON wallet_transactions (reference)`).Error; err != nil {
		t.Fatalf("create unique index: %v", err)
	}
	if err := db.Exec(`INSERT INTO wallet_transactions (id, reference) VALUES ('seed-id', 'ref-collide')`).Error; err != nil {
		t.Fatalf("seed ledger: %v", err)
	}
	record := ledgerRow(400, "ref-collide")

	err := NewWalletRepository(db).MoveFundsWithLedger(
		businessID, "orders_in_progress", "clearing_balance", 400, record)
	if err == nil {
		t.Fatal("expected the ledger insert to fail the whole operation")
	}

	got := readWallet(t, db, businessID)
	if got.OrdersInProgress != opening || got.ClearingBalance != 0 {
		t.Errorf("balances moved despite the ledger row failing: orders_in_progress=%.2f "+
			"clearing=%.2f — money moved with no record of it",
			got.OrdersInProgress, got.ClearingBalance)
	}
}

// G28: balance_before / balance_after describe the move that actually happened.
//
// Every writer used to update the balance first and re-read it after, so the
// "before" it recorded was already the "after" — a 400 credit into an empty
// bucket wrote before=400, after=800. Both columns overstated by one amount, on
// every row ever written.
func TestMoveFundsWithLedger_LedgerBracketsTheMove(t *testing.T) {
	db, businessID := openWalletPG(t, 1000, 250, 0, 0)

	record := ledgerRow(400, "ref-bracket")
	if err := NewWalletRepository(db).MoveFundsWithLedger(
		businessID, "orders_in_progress", "clearing_balance", 400, record); err != nil {
		t.Fatalf("move: %v", err)
	}

	var before, after float64
	if err := db.Raw(`SELECT balance_before, balance_after FROM wallet_transactions
		WHERE reference = ?`, "ref-bracket").Row().Scan(&before, &after); err != nil {
		t.Fatalf("read ledger row: %v", err)
	}

	// clearing_balance was 250 and 400 arrived.
	if before != 250 {
		t.Errorf("balance_before = %.2f, want 250 (the DESTINATION balance before the move)", before)
	}
	if after != 650 {
		t.Errorf("balance_after = %.2f, want 650", after)
	}
	got := readWallet(t, db, businessID)
	if got.ClearingBalance != after {
		t.Errorf("balance_after (%.2f) does not match the wallet (%.2f) — the ledger "+
			"is describing a state the wallet was never in", after, got.ClearingBalance)
	}
}

// Same check on the accrual side, which had the identical defect.
func TestCreditWithLedger_LedgerBracketsTheCredit(t *testing.T) {
	db, businessID := openWalletPG(t, 700, 0, 0, 0)

	record := ledgerRow(300, "ref-accrue")
	if err := NewWalletRepository(db).CreditWithLedger(
		businessID, "orders_in_progress", 300, record); err != nil {
		t.Fatalf("credit: %v", err)
	}

	var before, after float64
	if err := db.Raw(`SELECT balance_before, balance_after FROM wallet_transactions
		WHERE reference = ?`, "ref-accrue").Row().Scan(&before, &after); err != nil {
		t.Fatalf("read ledger row: %v", err)
	}
	if before != 700 || after != 1000 {
		t.Errorf("ledger row = (before %.2f, after %.2f), want (700, 1000)", before, after)
	}
	if got := readWallet(t, db, businessID); got.OrdersInProgress != 1000 {
		t.Errorf("orders_in_progress = %.2f, want 1000", got.OrdersInProgress)
	}
}

// A balance change with no ledger row must be impossible, not merely
// discouraged. The draft returned nil here and moved the money anyway.
func TestBalanceChangesRequireALedgerRecord(t *testing.T) {
	const opening = 1000.0
	db, businessID := openWalletPG(t, opening, 0, 0, 0)
	repo := NewWalletRepository(db)

	if err := repo.MoveFundsWithLedger(businessID, "orders_in_progress", "clearing_balance", 100, nil); err == nil {
		t.Error("MoveFundsWithLedger accepted a nil ledger record — money can move unrecorded")
	}
	if err := repo.CreditWithLedger(businessID, "orders_in_progress", 100, nil); err == nil {
		t.Error("CreditWithLedger accepted a nil ledger record")
	}

	if got := readWallet(t, db, businessID); got.OrdersInProgress != opening || got.ClearingBalance != 0 {
		t.Errorf("balances changed on a rejected call: orders_in_progress=%.2f clearing=%.2f",
			got.OrdersInProgress, got.ClearingBalance)
	}
}

// G2. `binding:"required"` rejects 0 — the float zero value — but accepts
// -1000, which passed both balance checks and then DECREMENTED the reservation,
// inflating the seller's withdrawable balance by the amount they "requested".
func TestNonPositiveAmountsAreRefused(t *testing.T) {
	db, businessID := openWalletPG(t, 1000, 1000, 5000, 1000)
	repo := NewWalletRepository(db)
	before := readWallet(t, db, businessID)

	for _, amount := range []float64{0, -1, -1000, -0.01} {
		if err := repo.MoveFundsWithLedger(businessID, "orders_in_progress", "clearing_balance",
			amount, ledgerRow(amount, "ref-neg")); err == nil {
			t.Errorf("MoveFundsWithLedger accepted amount %.2f", amount)
		}
		if err := repo.CreditWithLedger(businessID, "orders_in_progress", amount,
			ledgerRow(amount, "ref-neg")); err == nil {
			t.Errorf("CreditWithLedger accepted amount %.2f", amount)
		}
		if err := repo.LockBalance(businessID, amount); err == nil {
			t.Errorf("LockBalance accepted amount %.2f — a negative reservation inflates "+
				"the withdrawable balance", amount)
		}
		if err := repo.UnlockBalance(businessID, amount); err == nil {
			t.Errorf("UnlockBalance accepted amount %.2f", amount)
		}
	}

	if got := readWallet(t, db, businessID); got != before {
		t.Errorf("a rejected amount still changed the wallet: %+v -> %+v", before, got)
	}
}

// The field names are interpolated into SQL, so the allowlist is a boundary and
// not a convenience.
func TestBucketNamesAreAllowlisted(t *testing.T) {
	db, businessID := openWalletPG(t, 1000, 0, 0, 0)
	repo := NewWalletRepository(db)

	bad := []struct{ from, to string }{
		{"total_earnings", "clearing_balance"},       // real column, not a bucket
		{"orders_in_progress", "total_withdrawn"},    // ditto
		{"orders_in_progress", "orders_in_progress"}, // same bucket
		{"orders_in_progress = 0 --", "clearing_balance"},
	}
	for _, c := range bad {
		if err := repo.MoveFundsWithLedger(businessID, c.from, c.to, 10,
			ledgerRow(10, "ref-bad")); err == nil {
			t.Errorf("accepted from=%q to=%q", c.from, c.to)
		}
	}
	if got := readWallet(t, db, businessID); got.OrdersInProgress != 1000 {
		t.Errorf("orders_in_progress = %.2f, want 1000", got.OrdersInProgress)
	}
}

// G2, the release side. UnlockBalance was an unconditional subtraction whose
// RowsAffected was never checked, so releasing more than was held drove
// pending_withdrawals NEGATIVE — and since withdrawable is
// `available - pending`, a negative reservation INFLATES what can be requested.
func TestUnlockBalance_RefusesToReleaseMoreThanIsHeld(t *testing.T) {
	db, businessID := openWalletPG(t, 0, 0, 5000, 1000)
	repo := NewWalletRepository(db)

	if err := repo.UnlockBalance(businessID, 1500); err == nil {
		t.Error("released 1500 against a 1000 reservation without complaint")
	}
	if got := readWallet(t, db, businessID); got.PendingWithdrawals != 1000 {
		t.Errorf("pending_withdrawals = %.2f, want 1000 (unchanged)", got.PendingWithdrawals)
	}

	// The legitimate release still works, exactly once.
	if err := repo.UnlockBalance(businessID, 1000); err != nil {
		t.Fatalf("a valid release failed: %v", err)
	}
	if got := readWallet(t, db, businessID); got.PendingWithdrawals != 0 {
		t.Errorf("pending_withdrawals = %.2f, want 0", got.PendingWithdrawals)
	}
	// Releasing the same reservation twice is the double-reject case.
	if err := repo.UnlockBalance(businessID, 1000); err == nil {
		t.Error("released the same reservation twice — pending_withdrawals would go negative")
	}
	if got := readWallet(t, db, businessID); got.PendingWithdrawals != 0 {
		t.Errorf("pending_withdrawals = %.2f after a double release, want 0", got.PendingWithdrawals)
	}
}

// UnlockBalanceTx is the same guard addressed by wallet id, which is what
// AdminService.RejectWithdrawal uses. Its inline predecessor had neither the
// floor nor the RowsAffected check.
func TestUnlockBalanceTx_IsGuardedAndScopedToTheTransaction(t *testing.T) {
	db, businessID := openWalletPG(t, 0, 0, 5000, 800)
	repo := NewWalletRepository(db)

	// Over-release inside a transaction fails, and the transaction is abandoned.
	err := db.Transaction(func(tx *gorm.DB) error {
		return repo.UnlockBalanceTx(tx, "w-p0", 900)
	})
	if err == nil {
		t.Error("UnlockBalanceTx released 900 against an 800 reservation")
	}
	if got := readWallet(t, db, businessID); got.PendingWithdrawals != 800 {
		t.Errorf("pending_withdrawals = %.2f, want 800", got.PendingWithdrawals)
	}

	// A valid release rolls back with its transaction — the rejection of a
	// withdrawal request and the release of its funds are one atomic decision.
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := repo.UnlockBalanceTx(tx, "w-p0", 800); err != nil {
			return err
		}
		return fmt.Errorf("the status update failed after the release")
	})
	if err == nil {
		t.Fatal("expected the transaction to fail")
	}
	if got := readWallet(t, db, businessID); got.PendingWithdrawals != 800 {
		t.Errorf("pending_withdrawals = %.2f — the release committed even though the "+
			"rejection it belonged to did not", got.PendingWithdrawals)
	}
}

// Sufficiency is checked against the LOCKED read, so concurrent movers cannot
// between them move more than exists.
func TestMoveFundsWithLedger_CannotOverdrawUnderConcurrency(t *testing.T) {
	const (
		opening = 1000.0
		amount  = 400.0
		movers  = 6 // 6 * 400 = 2400, well over the 1000 available
	)
	db, businessID := openWalletPG(t, opening, 0, 0, 0)

	var start sync.WaitGroup
	start.Add(1)
	var done sync.WaitGroup
	var succeeded atomic.Int64

	for i := 0; i < movers; i++ {
		done.Add(1)
		go func(i int) {
			defer done.Done()
			start.Wait()
			if err := NewWalletRepository(db).MoveFundsWithLedger(
				businessID, "orders_in_progress", "clearing_balance", amount,
				ledgerRow(amount, fmt.Sprintf("od-%d", i))); err == nil {
				succeeded.Add(1)
			}
		}(i)
	}
	start.Done()
	done.Wait()

	if got := succeeded.Load(); got != 2 {
		t.Errorf("%d of %d moves succeeded, want 2 (1000 / 400)", got, movers)
	}
	got := readWallet(t, db, businessID)
	if got.OrdersInProgress < 0 {
		t.Errorf("orders_in_progress went NEGATIVE (%.2f) — the balance was overdrawn", got.OrdersInProgress)
	}
	if got.OrdersInProgress+got.ClearingBalance != opening {
		t.Errorf("money was created or destroyed: %.2f + %.2f != %.2f",
			got.OrdersInProgress, got.ClearingBalance, opening)
	}
}

// The lock on the ACCRUAL path, which a balance-sum assertion cannot see.
//
// CreditWithLedger applies an expression delta, so concurrent credits all land
// on the balance whether or not the row is locked — a "do all the credits
// arrive" test passes either way. What the lock actually protects is the LEDGER
// CHAIN: without it, two concurrent accruals both read the same pre-credit
// balance and both write `balance_before = 0`, so two rows claim to describe
// the same starting state and the running balance in a seller's statement stops
// reconciling.
//
// This was found by mutation testing, not by writing the test first: removing
// the `FOR UPDATE` from CreditWithLedger left the whole suite green.
func TestCreditWithLedger_ConcurrentAccrualsFormOneLedgerChain(t *testing.T) {
	const (
		amount    = 300.0
		creditors = 8
	)
	db, businessID := openWalletPG(t, 0, 0, 0, 0)

	var start sync.WaitGroup
	start.Add(1)
	var done sync.WaitGroup
	errs := make(chan error, creditors)

	for i := 0; i < creditors; i++ {
		done.Add(1)
		go func(i int) {
			defer done.Done()
			start.Wait()
			errs <- NewWalletRepository(db).CreditWithLedger(
				businessID, "orders_in_progress", amount,
				ledgerRow(amount, fmt.Sprintf("accrue-%d", i)),
			)
		}(i)
	}
	start.Done()
	done.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatalf("a concurrent accrual failed: %v", err)
		}
	}

	if got := readWallet(t, db, businessID); got.OrdersInProgress != amount*creditors {
		t.Errorf("orders_in_progress = %.2f, want %.2f", got.OrdersInProgress, amount*creditors)
	}

	var befores []float64
	if err := db.Raw(`SELECT balance_before FROM wallet_transactions ORDER BY balance_before`).
		Scan(&befores).Error; err != nil {
		t.Fatalf("read ledger: %v", err)
	}
	if len(befores) != creditors {
		t.Fatalf("got %d ledger rows, want %d", len(befores), creditors)
	}
	// Serialised accruals produce each step of the chain exactly once.
	for i, got := range befores {
		want := float64(i) * amount
		if got != want {
			t.Errorf("ledger row %d records balance_before = %.2f, want %.2f — two accruals "+
				"read the same starting balance, so the chain has a duplicate step and "+
				"the statement will not reconcile", i, got, want)
		}
	}
}
