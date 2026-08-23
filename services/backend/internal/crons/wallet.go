package crons

import (
	"context"
	"fmt"
	"time"

	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"insta-api/internal/core/domain"
	"insta-api/internal/core/services"
	"insta-api/internal/helper"
	"insta-api/internal/ports"
)

type WalletCron struct {
	DB          *gorm.DB
	WalletRepo  ports.WalletInterface
	ProductRepo ports.ProductRepoIface
	OrderRepo   ports.OrderRepoInterface
	Dispatcher  *services.NotificationDispatcher
}

func NewWalletCron(db *gorm.DB, walletRepo ports.WalletInterface,
	productRepo ports.ProductRepoIface, orderRepo ports.OrderRepoInterface) *WalletCron {
	return &WalletCron{
		db,
		walletRepo,
		productRepo,
		orderRepo,
		services.NewNotificationDispatcher(db),
	}
}

func (c *WalletCron) ReleaseClearingBalanceToAvailable() {
	// Sweep both the authed and guest order tables. The wallet is business-keyed,
	// so a Self-delivery order placed by a guest still credits the seller — its
	// order_item just lives in order_items_guest. Without the guest sweep those
	// funds would sit in clearing forever (pre-existing gap for any guest order
	// that reaches "delivered").
	c.releaseFromTable("order_items", false)
	c.releaseFromTable("order_items_guest", true)
	log.Println("Completed ReleaseClearingBalanceToAvailable cron job")
}

// releaseFromTable releases matured clearing funds for delivered items in one
// order-item table (authed or guest). Every DB touch is scoped to `table` and
// the order lookup uses `isGuest`, so the two tables are processed identically.
func (c *WalletCron) releaseFromTable(table string, isGuest bool) {
	var items []domain.OrderItem
	if err := c.DB.Table(table).
		Where("status = ? AND vendor_credited = ? AND status_updated_at <= ?", "delivered", false, time.Now().Add(-24*time.Hour)).
		Find(&items).Error; err != nil {
		log.Printf("error fetching delivered items from %s: %v", table, err)
		return
	}

	for _, item := range items {
		amount := item.Price * float64(item.Quantity)
		var productTitle, buyerID string
		var beforeSales float64
		var sellerVerified bool

		err := c.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Table(table).Clauses(clause.Locking{Strength: "UPDATE"}).
				First(&item, "id = ?", item.ID).Error; err != nil {
				return err
			}

			if item.Status != "delivered" || item.VendorCredited || time.Since(item.StatusUpdatedAt) < 24*time.Hour {
				return nil
			}

			err := c.WalletRepo.UpdateBalanceFieldByBusinessIDTx(
				tx,
				item.BusinessID,
				"clearing_balance", -amount,
				"available_balance", amount,
			)
			if err != nil {
				return err
			}

			// Capture the seller's pre-increment settled sales + verification so we
			// can nudge them exactly when they cross the ₦100k withdrawal gate.
			var biz domain.Business
			if err := tx.Model(&domain.Business{}).Where("id = ?", item.BusinessID).First(&biz).Error; err == nil {
				beforeSales = biz.LifetimeSales
				sellerVerified = biz.IsVerified
			}

			// KYC1: settled sales — bump the seller's lifetime_sales counter in the
			// SAME tx, so it can never drift from the money actually released to
			// available. This is the figure the ₦100k withdrawal gate reads.
			if err := tx.Model(&domain.Business{}).
				Where("id = ?", item.BusinessID).
				UpdateColumn("lifetime_sales", gorm.Expr("lifetime_sales + ?", amount)).Error; err != nil {
				return err
			}

			wallet, err := c.WalletRepo.GetOneTx(tx, map[string]interface{}{"business_id": item.BusinessID})
			if err != nil {
				return err
			}

			product, err := c.ProductRepo.Find(item.ProductID)
			if err != nil {
				return fmt.Errorf("something went wrong while fetching product")
			}
			productTitle = product.Title

			// Fetch order to get invoice for human-readable transaction description
			order, err := c.OrderRepo.GetOneOrder(map[string]interface{}{"id": item.OrderID}, isGuest)
			if err != nil {
				return fmt.Errorf("something went wrong while fetching order")
			}
			buyerID = order.UserID

			txRecord := &domain.WalletTransaction{
				WalletID:        wallet.ID,
				Type:            string(helper.CreditAvailableBalanceTransactionType),
				TypeDescription: fmt.Sprintf("%s order funds released #%s", product.Title, order.Invoice),
				Amount:          amount,
				Reference:       helper.GenerateReference(),
				BalanceBefore:   wallet.AvailableBalance,
				BalanceAfter:    wallet.AvailableBalance + amount,
				Status:          "success",
				Beneficiary:     wallet.BusinessID,
				From:            string(helper.CreditClearingBalanceTransactionType),
				To:              string(helper.AvailableBalanceWalletBalanceType),
				Metadata: domain.MapArray{
					{"order_item_id": item.ID},
				},
			}

			if err := c.WalletRepo.CreateWalletTransactionTx(tx, txRecord); err != nil {
				return err
			}

			if err := tx.Table(table).
				Where("id = ?", item.ID).
				Update("vendor_credited", true).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			log.Printf("Error crediting OrderItem %s: %v", item.ID, err)
			continue
		}

		// NS2 seller.payout.funds_cleared — post-commit, best-effort, money untouched.
		_ = c.Dispatcher.EmitToBusiness(context.Background(), item.BusinessID, services.EmitInput{
			Event: "seller.payout.funds_cleared",
			Vars:  map[string]string{"item": productTitle, "amount": services.FormatNaira(amount)},
		})

		// NS2 buyer.item.review_request — order is settled (~24h post-delivery), a
		// natural moment to ask for a review.
		if buyerID != "" {
			_ = c.Dispatcher.Emit(context.Background(), services.EmitInput{
				Event:  "buyer.item.review_request",
				UserID: buyerID,
				Vars:   map[string]string{"item": productTitle, "itemId": item.ID},
			})
		}

		// NS2 withdrawal-gate nudges — fire once, on the release that pushes the
		// seller's settled sales across ₦80k / ₦100k, if they're not yet verified.
		// (Gate default ₦100,000 = KYC_WITHDRAWAL_GATE_NGN; nudge thresholds fixed.)
		afterSales := beforeSales + amount
		if !sellerVerified {
			if beforeSales < 80000 && afterSales >= 80000 {
				_ = c.Dispatcher.EmitToBusiness(context.Background(), item.BusinessID, services.EmitInput{
					Event: "seller.kyc.limit_approaching",
					Vars:  map[string]string{"amount": services.FormatNaira(100000 - afterSales)},
				})
			}
			if beforeSales < 100000 && afterSales >= 100000 {
				_ = c.Dispatcher.EmitToBusiness(context.Background(), item.BusinessID, services.EmitInput{
					Event: "seller.payout.verify_required",
				})
			}
		}
	}
}
