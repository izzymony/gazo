package mysql_repo

import (
	"errors"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// R6 behavioural regression.
//
// TransactionService.Verify credits sellers through a WalletRepository built
// from the OUTER *gorm.DB transaction handle (mysql_repo.NewWalletService(tx)).
// WalletRepository.UpdateBalanceField itself opens a nested r.db.Transaction —
// which, because r.db is already a transaction, becomes a SAVEPOINT inside the
// outer tx. These tests prove that when the outer transaction rolls back (a
// mid-loop failure in the credit loop), the wallet credit is undone too — so a
// paid multi-item order can never leave a seller half-credited.
//
// The Wallet model's Business association would drag the whole schema into
// AutoMigrate on sqlite, so we create just the columns UpdateBalanceField
// touches. A single open connection keeps the in-memory DB stable across the
// gorm pool.
func setupWalletDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db handle: %v", err)
	}
	sqlDB.SetMaxOpenConns(1) // in-memory sqlite lives per-connection

	if err := db.Exec(`CREATE TABLE wallets (
		id TEXT PRIMARY KEY,
		business_id TEXT,
		orders_in_progress REAL DEFAULT 0,
		clearing_balance REAL DEFAULT 0,
		available_balance REAL DEFAULT 0
	)`).Error; err != nil {
		t.Fatalf("create table: %v", err)
	}
	if err := db.Exec(
		`INSERT INTO wallets (id, business_id, orders_in_progress) VALUES (?, ?, ?)`,
		"w1", "biz-r6", 1000.0,
	).Error; err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
	return db
}

func ordersInProgress(t *testing.T, db *gorm.DB) float64 {
	t.Helper()
	var v float64
	if err := db.Raw(
		`SELECT orders_in_progress FROM wallets WHERE business_id = ?`, "biz-r6",
	).Scan(&v).Error; err != nil {
		t.Fatalf("read balance: %v", err)
	}
	return v
}

func TestR6_CreditRollsBackWhenOuterTxFails(t *testing.T) {
	db := setupWalletDB(t)

	err := db.Transaction(func(tx *gorm.DB) error {
		// Repo bound to the outer tx — exactly how Verify builds its collaborators.
		if err := NewWalletRepository(tx).UpdateBalanceField("biz-r6", "orders_in_progress", 500); err != nil {
			return err
		}
		// A later item in the credit loop fails.
		return errors.New("mid-loop failure")
	})
	if err == nil {
		t.Fatal("expected the outer transaction to fail")
	}
	if got := ordersInProgress(t, db); got != 1000 {
		t.Fatalf("credit was NOT rolled back on outer-tx failure: orders_in_progress = %v, want 1000 "+
			"(a seller would be half-credited for an order that failed to fully process)", got)
	}
}

func TestR6_CreditCommitsWhenOuterTxSucceeds(t *testing.T) {
	db := setupWalletDB(t)

	err := db.Transaction(func(tx *gorm.DB) error {
		return NewWalletRepository(tx).UpdateBalanceField("biz-r6", "orders_in_progress", 500)
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got := ordersInProgress(t, db); got != 1500 {
		t.Fatalf("credit did not commit: orders_in_progress = %v, want 1500", got)
	}
}
