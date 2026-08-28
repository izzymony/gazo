package mysql_repo

import (
	"errors"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// RW1 money-safety regressions for the rewards-credit reservation primitives.
//
// These prove the exactly-once / never-under-apply / never-double-credit guards at
// the repository layer (the atomic authority): ReserveCredit holds the full amount
// or nothing, RefundCredit restores the exact per-bucket split, ClaimReservationRelease
// releases at most once and never after convert, and MarkReferralActivatedIfNot lets
// only ONE caller win. Raw tables (no AutoMigrate — User/Transaction associations
// would drag the whole schema onto sqlite); one connection keeps :memory: stable.
func setupRW1DB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db handle: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	if err := db.Exec(`CREATE TABLE users (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		shopping_credit REAL DEFAULT 0,
		withdrawable_credit REAL DEFAULT 0,
		referral_activated INTEGER DEFAULT 0,
		total_referral_earned REAL DEFAULT 0
	)`).Error; err != nil {
		t.Fatalf("create users: %v", err)
	}
	if err := db.Exec(`CREATE TABLE transactions (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		user_id TEXT,
		reference TEXT,
		credit_reserved_shopping REAL DEFAULT 0,
		credit_reserved_withdrawable REAL DEFAULT 0,
		credit_converted_at DATETIME,
		credit_released_at DATETIME
	)`).Error; err != nil {
		t.Fatalf("create transactions: %v", err)
	}
	return db
}

func seedUser(t *testing.T, db *gorm.DB, id string, shopping, withdrawable float64, activated bool) {
	t.Helper()
	act := 0
	if activated {
		act = 1
	}
	if err := db.Exec(`INSERT INTO users (id, shopping_credit, withdrawable_credit, referral_activated) VALUES (?, ?, ?, ?)`,
		id, shopping, withdrawable, act).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}
}

func userBalances(t *testing.T, db *gorm.DB, id string) (float64, float64) {
	t.Helper()
	var row struct {
		ShoppingCredit     float64
		WithdrawableCredit float64
	}
	if err := db.Raw(`SELECT shopping_credit, withdrawable_credit FROM users WHERE id = ?`, id).Scan(&row).Error; err != nil {
		t.Fatalf("read balances: %v", err)
	}
	return row.ShoppingCredit, row.WithdrawableCredit
}

// ReserveCredit holds shopping-first then withdrawable, exact amount, and returns the split.
func TestReserveCredit_HoldsSplitExactly(t *testing.T) {
	db := setupRW1DB(t)
	repo := &ReferralRepository{db: db}
	seedUser(t, db, "u1", 800, 400, false)

	sUsed, wUsed, err := repo.ReserveCredit("u1", 1000)
	if err != nil {
		t.Fatalf("reserve: %v", err)
	}
	if sUsed != 800 || wUsed != 200 {
		t.Fatalf("split = (%.0f,%.0f), want (800,200)", sUsed, wUsed)
	}
	if s, w := userBalances(t, db, "u1"); s != 0 || w != 200 {
		t.Fatalf("balance = (%.0f,%.0f), want (0,200)", s, w)
	}
}

// ReserveCredit holds the FULL amount or NOTHING — never under-applies.
func TestReserveCredit_InsufficientLeavesBalanceUntouched(t *testing.T) {
	db := setupRW1DB(t)
	repo := &ReferralRepository{db: db}
	seedUser(t, db, "u1", 100, 0, false)

	_, _, err := repo.ReserveCredit("u1", 500)
	if !errors.Is(err, ErrInsufficientCredit) {
		t.Fatalf("err = %v, want ErrInsufficientCredit", err)
	}
	if s, w := userBalances(t, db, "u1"); s != 100 || w != 0 {
		t.Fatalf("balance changed to (%.0f,%.0f), want untouched (100,0)", s, w)
	}
}

// RefundCredit restores the exact per-bucket split (the release path).
func TestRefundCredit_RestoresExactSplit(t *testing.T) {
	db := setupRW1DB(t)
	repo := &ReferralRepository{db: db}
	seedUser(t, db, "u1", 800, 400, false)

	sUsed, wUsed, _ := repo.ReserveCredit("u1", 1000) // -> (800,200) held, balance (0,200)
	if err := repo.RefundCredit("u1", sUsed, wUsed); err != nil {
		t.Fatalf("refund: %v", err)
	}
	if s, w := userBalances(t, db, "u1"); s != 800 || w != 400 {
		t.Fatalf("after refund = (%.0f,%.0f), want original (800,400)", s, w)
	}
}

// MarkReferralActivatedIfNot lets exactly ONE caller win — the double-credit guard.
func TestMarkReferralActivatedIfNot_OnlyOneWins(t *testing.T) {
	db := setupRW1DB(t)
	repo := &ReferralRepository{db: db}
	seedUser(t, db, "u1", 0, 0, false)

	won1, err := repo.MarkReferralActivatedIfNot("u1")
	if err != nil || !won1 {
		t.Fatalf("first claim won=%v err=%v, want won", won1, err)
	}
	won2, err := repo.MarkReferralActivatedIfNot("u1")
	if err != nil || won2 {
		t.Fatalf("second claim won=%v err=%v, want NOT won (no double-credit)", won2, err)
	}
}

func seedReservedTxn(t *testing.T, db *gorm.DB, id string, shopping, withdrawable float64) {
	t.Helper()
	if err := db.Exec(`INSERT INTO transactions (id, user_id, credit_reserved_shopping, credit_reserved_withdrawable) VALUES (?, ?, ?, ?)`,
		id, "u1", shopping, withdrawable).Error; err != nil {
		t.Fatalf("seed txn: %v", err)
	}
}

// ClaimReservationRelease is exactly-once — the release idempotency guard.
func TestClaimReservationRelease_Idempotent(t *testing.T) {
	db := setupRW1DB(t)
	repo := &TransactionRepository{db: db}
	seedReservedTxn(t, db, "t1", 300, 200)

	won1, err := repo.ClaimReservationRelease("t1", false)
	if err != nil || !won1 {
		t.Fatalf("first release won=%v err=%v, want won", won1, err)
	}
	won2, err := repo.ClaimReservationRelease("t1", false)
	if err != nil || won2 {
		t.Fatalf("second release won=%v err=%v, want NOT won (no double-refund)", won2, err)
	}
}

// A converted reservation can never be released.
func TestClaimReservationRelease_BlockedAfterConvert(t *testing.T) {
	db := setupRW1DB(t)
	repo := &TransactionRepository{db: db}
	seedReservedTxn(t, db, "t1", 300, 200)

	if err := repo.MarkReservationConverted("t1", false); err != nil {
		t.Fatalf("convert: %v", err)
	}
	won, err := repo.ClaimReservationRelease("t1", false)
	if err != nil || won {
		t.Fatalf("release after convert won=%v err=%v, want NOT won", won, err)
	}
}

// No hold (0 reserved) → nothing to release.
func TestClaimReservationRelease_NoHold(t *testing.T) {
	db := setupRW1DB(t)
	repo := &TransactionRepository{db: db}
	seedReservedTxn(t, db, "t1", 0, 0)

	won, err := repo.ClaimReservationRelease("t1", false)
	if err != nil || won {
		t.Fatalf("release with no hold won=%v err=%v, want NOT won", won, err)
	}
}
