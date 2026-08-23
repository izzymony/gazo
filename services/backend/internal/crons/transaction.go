package crons

import (
	"time"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"insta-api/internal/adapter/api/requests"
	"insta-api/internal/core/domain"
	"insta-api/internal/core/services"
	"insta-api/internal/helper"
)

// pendingSweepAfter: a pending transaction is only re-checked once its checkout
// window is realistically over (Paystack sessions lapse well before this), so
// the GC never races a customer still on the payment page.
const pendingSweepAfter = 30 * time.Minute

// pendingExpireAfter: a transaction still pending this long after creation was
// abandoned before payment — Paystack has no successful charge for it — so it is
// expired to stop being swept.
const pendingExpireAfter = 24 * time.Hour

type TransactionCron struct {
	DB                 *gorm.DB
	TransactionService *services.TransactionService
}

func NewTransactionCron(db *gorm.DB) *TransactionCron {
	return &TransactionCron{
		DB:                 db,
		TransactionService: services.NewTransactionService(db),
	}
}

// ReconcilePendingTransactions re-checks stuck pending transactions against
// Paystack. Verify is the single settlement path: if the charge actually
// succeeded it creates the order (idempotently, via ClaimPending on the
// order-on-success path or ClaimPaymentReceived on the legacy path); if it
// failed/abandoned it records that status. A Verify error just means Paystack
// is unreachable or has no record yet — the transaction is left pending for a
// later run, and expired only once past the expiry window. Covers both the live
// and guest transaction tables.
func (c *TransactionCron) ReconcilePendingTransactions() {
	for _, isGuest := range []bool{false, true} {
		table := "transactions"
		if isGuest {
			table += "_guest"
		}

		var pending []domain.Transaction
		if err := c.DB.Table(table).
			Where("status = ? AND created_at <= ?", string(helper.PaymentPending), time.Now().Add(-pendingSweepAfter)).
			Find(&pending).Error; err != nil {
			log.Printf("pending-GC: fetch %s failed: %v", table, err)
			continue
		}

		for _, tx := range pending {
			// Settle via the shared Verify path (paid -> order created;
			// failed/abandoned -> status recorded). Errors are expected for
			// still-unpaid references and are non-fatal.
			if _, err := c.TransactionService.Verify(requests.VerifyTransaction{Reference: tx.Reference}, isGuest); err != nil {
				log.Printf("pending-GC: verify %s (%s) unsettled: %v", tx.ID, table, err)
			}

			// Backstop: anything still pending past the expiry window is dead.
			// ExpireIfPending is conditional, so a transaction Verify just settled
			// is left untouched.
			if time.Since(tx.CreatedAt) > pendingExpireAfter {
				if err := c.TransactionService.ExpireIfPending(tx.ID, isGuest); err != nil {
					log.Printf("pending-GC: expire %s (%s) failed: %v", tx.ID, table, err)
				}
			}
		}
	}
	log.Println("Completed ReconcilePendingTransactions cron job")
}
