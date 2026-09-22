package crons

import (
	"fmt"

	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
	"github.com/robfig/cron/v3"
	"gorm.io/gorm"
)

func StartCron(db *gorm.DB, walletRepo ports.WalletInterface, productRepo ports.ProductRepoIface, orderRepo ports.OrderRepoInterface) {
	fmt.Println("Starting cron...")
	walletCron := NewWalletCron(db, walletRepo, productRepo, orderRepo)
	transactionCron := NewTransactionCron(db)
	payoutCron := NewPayoutCron(db)

	c := cron.New()
	c.AddFunc("0 0 * * *", walletCron.ReleaseClearingBalanceToAvailable)    // midnight
	c.AddFunc("*/15 * * * *", transactionCron.ReconcilePendingTransactions) // every 15 min: reconcile stuck payments
	// Every 5 minutes, and more often than the payment reconciler on purpose: a
	// payout left in `processing` is holding a seller's funds reserved, so the
	// cost of checking is a request and the cost of not checking is their money
	// being unavailable.
	c.AddFunc("*/5 * * * *", payoutCron.ReconcileStuckTransfers)
	c.Start()
}
