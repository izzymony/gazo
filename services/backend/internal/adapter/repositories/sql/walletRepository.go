package mysql_repo

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type WalletRepository struct {
	db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) ports.WalletInterface {
	return &WalletRepository{
		db: db,
	}
}

func (r *WalletRepository) Create(data *domain.Wallet) (domain.Wallet, error) {
	if err := r.db.Create(data).Error; err != nil {
		return domain.Wallet{}, err
	}
	return *data, nil
}

func (r *WalletRepository) Find(id string) (domain.Wallet, error) {
	var wallet domain.Wallet
	if err := r.db.First(&wallet, "id = ?", id).Error; err != nil {
		return domain.Wallet{}, err
	}
	return wallet, nil
}

func (r *WalletRepository) GetOne(param map[string]interface{}) (*domain.Wallet, error) {
	var wallet domain.Wallet
	q := r.db.Model(&domain.Wallet{})

	for key, value := range param {
		if value != nil {
			q = q.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}

	if err := q.First(&wallet).Error; err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (r *WalletRepository) GetOneTx(tx *gorm.DB, param map[string]interface{}) (*domain.Wallet, error) {
	var wallet domain.Wallet
	q := tx.Model(&domain.Wallet{})
	for key, value := range param {
		if value != nil {
			q = q.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}
	if err := q.FirstOrCreate(&wallet).Error; err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (r *WalletRepository) Update(id string, data domain.Wallet) (*domain.Wallet, error) {
	if err := r.db.Model(&domain.Wallet{}).Where("id = ?", id).Updates(data).Error; err != nil {
		return nil, err
	}

	updated, err := r.Find(id)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *WalletRepository) UpdateBalanceField(businessID string, field string, amount float64) error {
	allowedFields := map[string]bool{
		"available_balance":  true,
		"clearing_balance":   true,
		"orders_in_progress": true,
	}

	if !allowedFields[field] {
		return fmt.Errorf("invalid wallet field: %s", field)
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.Wallet{}).
			Where("business_id = ?", businessID).
			UpdateColumn(field, gorm.Expr(fmt.Sprintf("%s + ?", field), amount)).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *WalletRepository) UpdateBalanceFieldByBusinessIDTx(
	tx *gorm.DB,
	businessID string,
	debitField string, debitAmount float64,
	creditField string, creditAmount float64,
) error {
	updates := map[string]interface{}{
		debitField:  gorm.Expr(fmt.Sprintf("%s + ?", debitField), debitAmount),
		creditField: gorm.Expr(fmt.Sprintf("%s + ?", creditField), creditAmount),
	}

	if creditField == "available_balance" && creditAmount > 0 {
		updates["total_earnings"] = gorm.Expr("total_earnings + ?", creditAmount)
	}

	return tx.Model(&domain.Wallet{}).
		Where("business_id = ?", businessID).
		Updates(updates).Error
}

// balanceFields is the set of buckets MoveFundsWithLedger may touch. An
// allowlist, not a switch, because the field names are interpolated into SQL.
var balanceFields = map[string]bool{
	"available_balance":  true,
	"clearing_balance":   true,
	"orders_in_progress": true,
}

// MoveFundsWithLedger moves an amount between two buckets AND writes its ledger
// row, in ONE transaction, under a row lock, using expression deltas.
//
// It replaces MoveFunds, which was the settlement path for every delivered item
// and had three defects that could each lose a seller's money:
//
//   - It read the wallet WITHOUT `FOR UPDATE`, mutated fields in Go, then
//     `Save`d the whole row. Two concurrent deliveries for one business both
//     read the same balances and the second overwrote the first — one credit
//     silently gone.
//   - That full-row `Save` rewrote available_balance, total_earnings,
//     pending_withdrawals and total_withdrawn from a stale read, so it could
//     also erase a concurrent LockBalance or a `paid` transition — releasing a
//     reservation that should still be held.
//   - The ledger row was written afterwards, by a separate call on `r.db`,
//     AFTER the move had already committed. A failure in between left money
//     moved with no record of it.
//
// The caller supplies the ledger row; this fills in WalletID, BalanceBefore and
// BalanceAfter from the locked read, so those can never describe a different
// wallet state than the one the move applied to.
func (r *WalletRepository) MoveFundsWithLedger(
	businessID, fromField, toField string,
	amount float64,
	record *domain.WalletTransaction,
) error {
	if amount <= 0 {
		return fmt.Errorf("invalid amount: %.2f", amount)
	}
	if !balanceFields[fromField] {
		return fmt.Errorf("invalid from field: %s", fromField)
	}
	if !balanceFields[toField] {
		return fmt.Errorf("invalid to field: %s", toField)
	}
	if fromField == toField {
		return fmt.Errorf("from and to field are the same: %s", fromField)
	}
	// No ledger row, no move. An earlier draft returned nil here and moved the
	// money anyway, which is exactly the hole this method exists to close: a
	// caller that forgot the argument would get a silent success and an
	// unrecorded balance change. Every real caller writes a row.
	if record == nil {
		return errors.New("ledger record is required: a balance move must be recorded")
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		var wallet domain.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("business_id = ?", businessID).First(&wallet).Error; err != nil {
			return err
		}

		// Sufficiency is checked against the LOCKED read, so it cannot be
		// invalidated between the check and the update.
		var from float64
		switch fromField {
		case "available_balance":
			from = wallet.AvailableBalance
		case "clearing_balance":
			from = wallet.ClearingBalance
		case "orders_in_progress":
			from = wallet.OrdersInProgress
		}
		if from < amount {
			return fmt.Errorf("insufficient %s: have %.2f, need %.2f", fromField, from, amount)
		}

		// Expression deltas on exactly two columns. Nothing else is written, so
		// a concurrent reservation or payout in another transaction survives.
		if err := tx.Model(&domain.Wallet{}).
			Where("business_id = ?", businessID).
			Updates(map[string]interface{}{
				fromField: gorm.Expr(fmt.Sprintf("%s - ?", fromField), amount),
				toField:   gorm.Expr(fmt.Sprintf("%s + ?", toField), amount),
			}).Error; err != nil {
			return err
		}

		var to float64
		switch toField {
		case "available_balance":
			to = wallet.AvailableBalance
		case "clearing_balance":
			to = wallet.ClearingBalance
		case "orders_in_progress":
			to = wallet.OrdersInProgress
		}
		record.WalletID = wallet.ID
		record.BalanceBefore = to
		record.BalanceAfter = to + amount
		return tx.Create(record).Error
	})
}

// CreditWithLedger credits ONE bucket and writes its ledger row in one
// transaction, under a row lock.
//
// This is the accrual side of MoveFundsWithLedger — money entering the wallet
// from outside rather than moving between buckets — and it exists for the same
// two reasons. The lock, because the previous path read the wallet back with an
// unlocked query to fill the ledger row. And the read ORDER, which was the
// quieter bug: the balance was incremented FIRST and re-read AFTER, so every
// row ever written recorded `balance_before` = the balance *after* the credit,
// and `balance_after` = that plus the amount again. A ₦1,000 credit into an
// empty bucket wrote `before=1000, after=2000`. Reading inside the lock, before
// the update, is what makes those two columns mean what they say.
//
// The repository may be constructed from an outer transaction handle (Verify
// does exactly that), in which case GORM makes this a SAVEPOINT and the credit
// rolls back with the outer transaction — the behaviour wallet_rollback_test.go
// pins.
func (r *WalletRepository) CreditWithLedger(
	businessID, field string,
	amount float64,
	record *domain.WalletTransaction,
) error {
	if amount <= 0 {
		return fmt.Errorf("invalid amount: %.2f", amount)
	}
	if !balanceFields[field] {
		return fmt.Errorf("invalid wallet field: %s", field)
	}
	if record == nil {
		return errors.New("ledger record is required: a balance credit must be recorded")
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		var wallet domain.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("business_id = ?", businessID).First(&wallet).Error; err != nil {
			return err
		}

		var before float64
		switch field {
		case "available_balance":
			before = wallet.AvailableBalance
		case "clearing_balance":
			before = wallet.ClearingBalance
		case "orders_in_progress":
			before = wallet.OrdersInProgress
		}

		if err := tx.Model(&domain.Wallet{}).
			Where("business_id = ?", businessID).
			UpdateColumn(field, gorm.Expr(fmt.Sprintf("%s + ?", field), amount)).Error; err != nil {
			return err
		}

		record.WalletID = wallet.ID
		record.BalanceBefore = before
		record.BalanceAfter = before + amount
		return tx.Create(record).Error
	})
}

func (r *WalletRepository) CreateWalletTransaction(tx *domain.WalletTransaction) error {
	return r.db.Create(tx).Error
}

func (r *WalletRepository) GetWalletTransactionByID(id string) (*domain.WalletTransaction, error) {
	var tx domain.WalletTransaction
	err := r.db.First(&tx, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &tx, nil
}

func (r *WalletRepository) GetWalletTransactions(
	filter map[string]interface{}, page, limit int,
) ([]domain.WalletTransaction, int64, error) {
	var txs []domain.WalletTransaction
	var total int64

	q := r.db.Model(&domain.WalletTransaction{})

	for k, v := range filter {
		if k == "type" {
			continue
		}
		if v != nil && v != "" {
			q = q.Where(fmt.Sprintf("%s = ?", k), v)
		}
	}

	if val, ok := filter["type"].(string); ok {
		if val == "credit" {
			q = q.Where("amount > 0")
		} else if val == "debit" {
			q = q.Where("amount < 0")
		}
	}

	err := q.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = q.Order("created_at desc").Offset(offset).Limit(limit).Find(&txs).Error
	return txs, total, err
}

func (r *WalletRepository) UpdateWalletTransaction(ref string, updates map[string]interface{}) error {
	return r.db.Model(&domain.WalletTransaction{}).
		Where("reference = ?", ref).
		Updates(updates).Error
}

func (r *WalletRepository) SumWalletTransactions(walletID, txType string) (float64, error) {
	var total float64
	err := r.db.Model(&domain.WalletTransaction{}).
		Where("wallet_id = ? AND type = ? AND status = ?", walletID, txType, "completed").
		Select("SUM(amount)").Scan(&total).Error
	if err != nil {
		return 0, err
	}
	return total, nil
}

func (r *WalletRepository) CreateWalletTransactionTx(tx *gorm.DB, record *domain.WalletTransaction) error {
	return tx.Create(record).Error
}

// GetWalletTransactionByOrderItemId get order item id in the metadata, and transaction type
func (r *WalletRepository) GetWalletTransactionByOrderItemId(tx *gorm.DB, transactionType, orderItemId string) (*domain.WalletTransaction, error) {
	var walletTransaction *domain.WalletTransaction

	err := tx.Model(&domain.WalletTransaction{}).
		Where("metadata @> ?", fmt.Sprintf(`[{"order_item_id": "%s"}]`, orderItemId)).
		Where("type = ?", transactionType).
		First(&walletTransaction).Error

	if err != nil {
		return nil, err
	}

	return walletTransaction, nil
}

func (r *WalletRepository) Withdraw(walletID string, amount float64) error {
	var wallet domain.Wallet
	if err := r.db.First(&wallet, "id = ?", walletID).Error; err != nil {
		return fmt.Errorf("wallet not found")
	}

	if wallet.AvailableBalance < amount {
		return fmt.Errorf("insufficient balance")
	}

	newBalance := wallet.AvailableBalance - amount
	return r.db.Model(&domain.Wallet{}).
		Where("id = ?", walletID).
		Update("available_balance", newBalance).Error
}

func (r *WalletRepository) UpdateWalletBalances(wallet *domain.Wallet) error {
	return r.db.Model(&domain.Wallet{}).
		Where("id = ?", wallet.ID).
		Updates(map[string]interface{}{
			"available_balance":  wallet.AvailableBalance,
			"clearing_balance":   wallet.ClearingBalance,
			"orders_in_progress": wallet.OrdersInProgress,
			"total_earnings":     wallet.TotalEarnings,
		}).Error
}

func (r *WalletRepository) DeleteTransactionsByOrderItemID(orderItemId string) error {
	return r.db.Where("metadata @> ?", fmt.Sprintf(`[{"order_item_id": "%s"}]`, orderItemId)).
		Delete(&domain.WalletTransaction{}).Error
}

// LockBalance atomically increments pending_withdrawals after validating sufficient balance
// Uses FOR UPDATE row locking to prevent race conditions
func (r *WalletRepository) LockBalance(businessID string, amount float64) error {
	// A negative amount passed the two balance checks below (`effectiveBalance <
	// -1000` is false) and then DECREMENTED pending_withdrawals, inflating the
	// seller's withdrawable balance by the amount they "requested".
	if amount <= 0 {
		return fmt.Errorf("invalid amount: %.2f", amount)
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		var wallet domain.Wallet
		// Use FOR UPDATE to lock the row and prevent concurrent modifications
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("business_id = ?", businessID).First(&wallet).Error; err != nil {
			return err
		}

		// Validate sufficient balance (available minus already pending)
		effectiveBalance := wallet.AvailableBalance - wallet.PendingWithdrawals
		if effectiveBalance < amount {
			return fmt.Errorf("insufficient balance: %.2f available, %.2f pending", effectiveBalance, wallet.PendingWithdrawals)
		}

		// Atomically increment pending_withdrawals
		return tx.Model(&domain.Wallet{}).
			Where("business_id = ?", businessID).
			Update("pending_withdrawals", gorm.Expr("pending_withdrawals + ?", amount)).Error
	})
}

// UnlockBalance atomically decrements pending_withdrawals (used on rejection or
// rollback).
//
// Guarded on the reservation actually being there. It used to be an
// unconditional subtraction, so releasing more than was held drove
// pending_withdrawals NEGATIVE — and because the withdrawable figure is
// `available - pending`, a negative reservation INFLATES what a seller can
// request. Zero rows affected now means "there was no such reservation", which
// is a bug to surface rather than a number to quietly corrupt.
func (r *WalletRepository) UnlockBalance(businessID string, amount float64) error {
	return releaseReservation(r.db, "business_id", businessID, amount)
}

// UnlockBalanceTx is UnlockBalance inside a caller's transaction, addressed by
// wallet id.
//
// AdminService.RejectWithdrawal held an inline copy of the unguarded version —
// same unconditional subtraction, same missing RowsAffected check — keyed on
// `withdrawal_requests.wallet_id`. That key is fine (it addresses the same
// row), but two copies of a money operation drift, and this one had already
// drifted: rejecting twice, or rejecting more than was reserved, drove
// pending_withdrawals negative. One implementation, two addressing modes.
func (r *WalletRepository) UnlockBalanceTx(tx *gorm.DB, walletID string, amount float64) error {
	return releaseReservation(tx, "id", walletID, amount)
}

// releaseReservation decrements pending_withdrawals only if the reservation is
// actually there, and treats "it wasn't" as an error rather than a no-op.
//
// The guard matters more than it looks: the withdrawable figure is
// `available_balance - pending_withdrawals`, so a NEGATIVE reservation does not
// merely look odd — it INFLATES what the seller is allowed to request. An
// unconditional subtraction turns a double-reject into minted money.
func releaseReservation(db *gorm.DB, keyColumn, keyValue string, amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("invalid amount: %.2f", amount)
	}
	res := db.Model(&domain.Wallet{}).
		Where(fmt.Sprintf("%s = ? AND pending_withdrawals >= ?", keyColumn), keyValue, amount).
		Update("pending_withdrawals", gorm.Expr("pending_withdrawals - ?", amount))
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected != 1 {
		return fmt.Errorf("no reservation of %.2f to release for wallet %s=%s", amount, keyColumn, keyValue)
	}
	return nil
}
