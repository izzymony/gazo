package mysql_repo

import (
	"fmt"
	"os"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

// G21: Paystack's collection fee, recorded per charge.
//
// The column is NULLABLE and that is the substance of it, not a detail. NULL
// means "we do not know what the fee was" — an old row, or a verify response
// that carried none — while 0 means Paystack charged nothing. Collapsing the
// two into a single 0 would make every historical row look like a free charge,
// and the reconciliation that eventually reads this could not tell a gap from a
// genuine zero.
//
// Postgres, because NULL-vs-zero and a guarded UPDATE's RowsAffected are the
// things under test.
func openTransactionPG(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("TEST_DATABASE_DSN not set — NULL semantics and a guarded UPDATE need " +
			"real Postgres, and a green run here would mean nothing")
	}
	schema := fmt.Sprintf("provider_fee_%d_%d", os.Getpid(), walletDBCounter.Add(1))
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
	// AutoMigrated from the model, so the fixture cannot drift from the column
	// definition under test.
	if err := db.AutoMigrate(&domain.Transaction{}); err != nil {
		t.Fatalf("migrate transactions: %v", err)
	}
	return db
}

func seedTransaction(t *testing.T, db *gorm.DB, ref string) string {
	t.Helper()
	txn := &domain.Transaction{Reference: ref, UserId: "user-1", Amount: 8450.50}
	if err := db.Create(txn).Error; err != nil {
		t.Fatalf("seed transaction: %v", err)
	}
	return txn.ID
}

func readFee(t *testing.T, db *gorm.DB, id string) *int64 {
	t.Helper()
	var txn domain.Transaction
	if err := db.First(&txn, "id = ?", id).Error; err != nil {
		t.Fatalf("read transaction: %v", err)
	}
	return txn.ProviderFeeKobo
}

// A new row starts UNKNOWN, not zero.
func TestProviderFee_StartsNullNotZero(t *testing.T) {
	db := openTransactionPG(t)
	id := seedTransaction(t, db, "INV-1")

	if fee := readFee(t, db, id); fee != nil {
		t.Errorf("provider_fee_kobo = %d on a fresh row, want NULL — a default of 0 "+
			"makes an unrecorded fee indistinguishable from a free charge", *fee)
	}
}

func TestProviderFee_RecordsTheFeeAndKeepsTheFirstValue(t *testing.T) {
	db := openTransactionPG(t)
	repo := NewTransactionRepository(db)
	id := seedTransaction(t, db, "INV-2")

	if err := repo.SetProviderFee(id, 12675, false); err != nil {
		t.Fatalf("record fee: %v", err)
	}
	fee := readFee(t, db, id)
	if fee == nil || *fee != 12675 {
		t.Fatalf("provider_fee_kobo = %v, want 12675", fee)
	}

	// Verify is called from the webhook, the client callback and the reconcile
	// cron, so the same fee arrives repeatedly. The first recorded value stands.
	if err := repo.SetProviderFee(id, 99999, false); err != nil {
		t.Fatalf("replayed fee: %v", err)
	}
	if fee := readFee(t, db, id); fee == nil || *fee != 12675 {
		t.Errorf("provider_fee_kobo = %v after a replay, want 12675 — a later, "+
			"different value overwrote the recorded one", fee)
	}
}

// A ZERO fee is a real answer and must be recorded as 0 — and then treated as
// recorded, not as still-missing.
//
// This is what the guard `IS NULL` buys over `IS NULL OR = 0`: with the looser
// guard, a genuine zero leaves the row permanently open to being overwritten by
// whatever arrives next, which is the opposite of an idempotent write.
func TestProviderFee_ZeroIsRecordedAndNotMistakenForUnknown(t *testing.T) {
	db := openTransactionPG(t)
	repo := NewTransactionRepository(db)
	id := seedTransaction(t, db, "INV-3")

	if err := repo.SetProviderFee(id, 0, false); err != nil {
		t.Fatalf("record zero fee: %v", err)
	}
	fee := readFee(t, db, id)
	if fee == nil {
		t.Fatal("a zero fee was not recorded at all — NULL and 0 are being conflated")
	}
	if *fee != 0 {
		t.Fatalf("provider_fee_kobo = %d, want 0", *fee)
	}

	// And it is now settled: a subsequent different value must not replace it.
	if err := repo.SetProviderFee(id, 5000, false); err != nil {
		t.Fatalf("replay after a zero: %v", err)
	}
	if fee := readFee(t, db, id); fee == nil || *fee != 0 {
		t.Errorf("provider_fee_kobo = %v, want 0 — a recorded zero was treated as "+
			"unknown and overwritten", fee)
	}
}

// The pre-existing `transaction_fee` column keeps its name, type and units.
// It has no writer, but repurposing a shipped column is not free: the name and
// units are part of the API response and of any query written against the
// table, and a float64 naira field silently becoming an int64 kobo field is
// invisible until a number is a hundred times too big.
func TestTransactionFee_IsUntouched(t *testing.T) {
	db := openTransactionPG(t)
	repo := NewTransactionRepository(db)
	id := seedTransaction(t, db, "INV-4")

	if err := repo.SetProviderFee(id, 12675, false); err != nil {
		t.Fatalf("record fee: %v", err)
	}

	var legacy float64
	if err := db.Raw(`SELECT COALESCE(transaction_fee, 0) FROM transactions WHERE id = ?`, id).
		Scan(&legacy).Error; err != nil {
		t.Fatalf("read transaction_fee: %v", err)
	}
	if legacy != 0 {
		t.Errorf("transaction_fee = %v — recording the provider fee wrote to the legacy "+
			"column, changing the meaning and units of a shipped field", legacy)
	}
}
