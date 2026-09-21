package ports

import (
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type WalletInterface interface {
	Create(data *domain.Wallet) (domain.Wallet, error)
	Find(id string) (domain.Wallet, error)
	GetOne(param map[string]interface{}) (*domain.Wallet, error)
	GetOneTx(tx *gorm.DB, param map[string]interface{}) (*domain.Wallet, error)
	Update(id string, data domain.Wallet) (*domain.Wallet, error)
	UpdateBalanceField(businessID, field string, amount float64) error
	// MoveFundsWithLedger and CreditWithLedger replace MoveFunds +
	// UpdateBalanceField + a separate CreateWalletTransaction. The ledger row is
	// not optional and not a second call: a balance change without its entry is
	// the failure mode these exist to make unrepresentable.
	MoveFundsWithLedger(businessID, fromField, toField string, amount float64, record *domain.WalletTransaction) error
	CreditWithLedger(businessID, field string, amount float64, record *domain.WalletTransaction) error
	UpdateBalanceFieldByBusinessIDTx(
		tx *gorm.DB,
		businessID string,
		debitField string, debitAmount float64,
		creditField string, creditAmount float64,
	) error
	CreateWalletTransaction(tx *domain.WalletTransaction) error
	CreateWalletTransactionTx(tx *gorm.DB, record *domain.WalletTransaction) error
	GetWalletTransactionByID(id string) (*domain.WalletTransaction, error)
	GetWalletTransactions(filter map[string]interface{}, page, limit int) ([]domain.WalletTransaction, int64, error)
	UpdateWalletTransaction(ref string, updates map[string]interface{}) error
	SumWalletTransactions(walletID, txType string) (float64, error)
	GetWalletTransactionByOrderItemId(tx *gorm.DB, transactionType, orderItemId string) (*domain.WalletTransaction, error)
	Withdraw(walletID string, amount float64) error
	UpdateWalletBalances(wallet *domain.Wallet) error
	DeleteTransactionsByOrderItemID(orderItemId string) error
	LockBalance(businessID string, amount float64) error
	UnlockBalance(businessID string, amount float64) error
	UnlockBalanceTx(tx *gorm.DB, walletID string, amount float64) error
}
