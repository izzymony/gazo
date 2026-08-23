package mysql_repo

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"insta-api/internal/core/domain"
	"insta-api/internal/ports"
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

func (r *WalletRepository) MoveFunds(businessID string, fromField string, toField string, amount float64) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var wallet domain.Wallet
		if err := tx.Where("business_id = ?", businessID).First(&wallet).Error; err != nil {
			return err
		}

		switch fromField {
		case "available_balance":
			if wallet.AvailableBalance < amount {
				return errors.New("insufficient available balance")
			}
			wallet.AvailableBalance -= amount
		case "clearing_balance":
			if wallet.ClearingBalance < amount {
				return errors.New("insufficient clearing balance")
			}
			wallet.ClearingBalance -= amount
		case "orders_in_progress":
			if wallet.OrdersInProgress < amount {
				return errors.New("insufficient orders in progress balance")
			}
			wallet.OrdersInProgress -= amount
		default:
			return errors.New("invalid from field")
		}

		switch toField {
		case "available_balance":
			wallet.AvailableBalance += amount
		case "clearing_balance":
			wallet.ClearingBalance += amount
		case "orders_in_progress":
			wallet.OrdersInProgress += amount
		default:
			return errors.New("invalid to field")
		}

		return tx.Save(&wallet).Error
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

// UnlockBalance atomically decrements pending_withdrawals (used on rejection or completion)
func (r *WalletRepository) UnlockBalance(businessID string, amount float64) error {
	return r.db.Model(&domain.Wallet{}).
		Where("business_id = ?", businessID).
		Update("pending_withdrawals", gorm.Expr("pending_withdrawals - ?", amount)).Error
}
