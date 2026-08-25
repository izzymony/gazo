package crons

import (
	"fmt"

	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

func StartCron(db *gorm.DB, walletRepo ports.WalletInterface, productRepo ports.ProductRepoIface, orderRepo ports.OrderRepoInterface) {
	fmt.Println("Starting cron...")
	walletCron := NewWalletCron(db, walletRepo, productRepo, orderRepo)
	transactionCron := NewTransactionCron(db)

	c := cron.New()
	c.AddFunc("0 0 * * *", walletCron.ReleaseClearingBalanceToAvailable)      // midnight
	c.AddFunc("*/15 * * * *", transactionCron.ReconcilePendingTransactions)   // every 15 min: reconcile stuck payments
	c.Start()
}
