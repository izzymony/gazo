package crons

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/payments"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
)

// The payout reconciler.
//
// Everything in the payout path is deliberately conservative in one direction:
// when Paystack's answer is unknown — a timeout, a 5xx, an unreadable reply —
// the withdrawal is left `processing` with the seller's funds still reserved,
// because releasing funds we are not certain failed is what lets the same money
// be withdrawn twice. That is safe but incomplete: without something to come
// back and ask, those payouts would sit there forever.
//
// This is that something. It also covers the crash window that no amount of
// care inside a request can close: the withdrawal is claimed and its permanent
// reference committed, and then the process dies before Paystack is called. The
// row looks identical to a timeout, and the fix is the same — ask Paystack what
// became of the reference, and re-send with that SAME reference if it never
// arrived, which Paystack deduplicates.
type PayoutCron struct {
	payouts *services.PayoutService
}

func NewPayoutCron(db *gorm.DB) *PayoutCron {
	// The dispatcher is wired here for the same reason the reconciler exists at
	// all. A payout that settles through this path settles because the webhook
	// never arrived or the process died mid-call — exactly the cases where the
	// seller has heard nothing. Passing nil would have left those sellers with
	// a withdrawal that silently became `paid` and no message about it.
	dispatcher := services.NewNotificationDispatcher(db)
	return &PayoutCron{
		payouts: services.NewPayoutService(db, payments.NewPaystackPaymentService(db),
			func(event, userID string, vars map[string]string) {
				_ = dispatcher.Emit(context.Background(), services.EmitInput{
					Event: event, UserID: userID, Vars: vars,
				})
			}),
	}
}

// stuckAfter is how long a transfer may sit without a verdict before we start
// asking. Long enough that a healthy transfer settles on its own and the
// reconciler never sees it; short enough that a stuck payout is found within a
// working day.
const stuckAfter = 10 * time.Minute

func (c *PayoutCron) ReconcileStuckTransfers() {
	// Deliberately NOT gated on PayoutsLive.
	//
	// It used to be, on the reasoning that nothing could have been initiated
	// so there was nothing to reconcile. That is only true of an environment
	// where payouts were never on. The flag is a kill switch, and the moment
	// it is most likely to be pulled is DURING an incident — with transfers
	// already in flight and sellers' funds already reserved. Gating this here
	// meant flipping the switch also switched off the thing that resolves
	// them, so every in-flight payout froze with the reservation held.
	//
	// The gate belongs on the single step that sends money, and that is where
	// it now is: PayoutService.retryInitiation.
	checked, err := c.payouts.ReconcileStuckTransfers(stuckAfter)
	if err != nil {
		logger.Error(fmt.Sprintf("payout reconciliation failed: %v", err))
		return
	}
	if checked > 0 {
		logger.Info(fmt.Sprintf("payout reconciliation checked %d transfer(s)", checked))
	}
}
