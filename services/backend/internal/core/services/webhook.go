package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/payments"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/smtp"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type WebhookService struct {
	transactionRepo       ports.TransactionRepoInterface
	TwilioCacheRepository ports.TwilioCacheInterface
	transactionService    *TransactionService
	orderRepo             ports.OrderRepoInterface
	shippingRepo          ports.ShippingInterface
	userRepo              ports.UserRepoInterface
	payments              payments.Paystack
	walletService         *WalletService
	orderService          *OrderService
	twilioService         *smtp.TwilioService
	notificationService   *NotificationService
	dispatcher            *NotificationDispatcher
	productRepo           ports.ProductRepoIface
}

func NewWebhookService(db *gorm.DB) *WebhookService {
	return &WebhookService{
		transactionRepo:       mysql_repo.NewTransactionRepository(db),
		TwilioCacheRepository: mysql_repo.NewTwilioCacheRepository(db),
		orderRepo:             mysql_repo.NewOrderRepository(db),
		userRepo:              mysql_repo.NewUserRepository(db),
		shippingRepo:          mysql_repo.NewShippingRepository(db),
		transactionService:    NewTransactionService(db),
		payments:              payments.NewPaystackPaymentService(db),
		walletService:         NewWalletService(db),
		orderService:          NewOrderService(db),
		twilioService:         smtp.NewTwilioService(db),
		notificationService:   NewNotificationService(db),
		dispatcher:            NewNotificationDispatcher(db),
		productRepo:           mysql_repo.NewProductRepository(db),
	}
}

// productTitle resolves a product's title for notification copy; empty on miss.
func (s *WebhookService) productTitle(productID string) string {
	p, err := s.productRepo.GetOne(map[string]interface{}{"id": productID})
	if err != nil || p == nil {
		return ""
	}
	return p.Title
}

func (s *WebhookService) PaystackWebhook(payload requests.PaystackWebhookRequest) error {
	logger.Info(fmt.Sprintf("Received Paystack Webhook: %v", payload.Event))
	switch payload.Event {
	case "charge.success":
		reference := payload.Data.Reference
		_, err := s.transactionService.Verify(requests.VerifyTransaction{Reference: reference}, false)
		return err
	case "charge.failed":
		// Order-on-success: a failed charge creates no order — just record the
		// transaction as failed so the pending-GC doesn't re-sweep it. On the
		// legacy order-first path the order simply stays un-credited.
		return s.transactionService.MarkFailed(payload.Data.Reference)
	}

	return nil
}

func (s *WebhookService) ShipbubbleWebhook(payload requests.ShipbubbleWebhookRequest) error {
	logger.Info(fmt.Sprintf("Received Shipbubble Webhook: %v", payload.Event))
	shipment, err := s.shippingRepo.GetOneShipment(map[string]interface{}{"provider_id": payload.OrderID}, false)
	if err != nil {
		// Everything below this point reads order_items/orders/users as NON-guest.
		// Guest checkout is gated to self-delivery (see GetShippingOptions) so a
		// guest courier shipment should not exist — but if one predates the gate,
		// fail LOUDLY and identifiably rather than as an opaque "record not found",
		// because the buyer has paid and the funds are sitting in orders_in_progress.
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if guestShipment, gErr := s.shippingRepo.GetOneShipment(map[string]interface{}{"provider_id": payload.OrderID}, true); gErr == nil && guestShipment != nil {
				logger.Error(fmt.Errorf(
					"shipbubble webhook: GUEST courier shipment %v (provider_id %v) cannot be settled — the courier lifecycle is not guest-aware; funds remain in orders_in_progress and need manual settlement",
					guestShipment.ID, payload.OrderID).Error())
				return fmt.Errorf("guest courier shipments are not supported")
			}
		}
		logger.Error(err.Error())
		return err
	}
	items, err := s.orderRepo.GetAllOrderItems(map[string]interface{}{"shipment_id": shipment.ID}, false)
	if err != nil {
		logger.Error(err.Error())
		return err
	}
	// Guard the empty slice before indexing items[0] (B2).
	if len(items) == 0 {
		logger.Error(fmt.Sprintf("Shipbubble webhook: no order items for shipment %v", shipment.ID))
		return fmt.Errorf("no order items for shipment")
	}
	order, err := s.orderRepo.Find(items[0].OrderID, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}
	// order is nil on ErrRecordNotFound — guard before dereferencing order.UserID (B2).
	if order == nil {
		logger.Error(fmt.Sprintf("Shipbubble webhook: order %v not found", items[0].OrderID))
		return fmt.Errorf("order not found")
	}
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": order.UserID,
	}, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if user == nil {
		return fmt.Errorf("invalid user")
	}

	switch payload.Status {
	case "confirmed":
		for _, item := range items {
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityShippingConfirmed),
				Subtitle: "Shipment Created & Assigned",
				Details:  "Your order is assigned to a delivery partner.",
				Time:     time.Now().String(),
			}, "buyer", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityShippingConfirmed),
				Subtitle: "Shipment Created & Assigned",

				Details: "Your order is assigned to a delivery partner.",
				Time:    time.Now().String(),
			}, "seller", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityRiderEnrouteToVendor),
				Subtitle: string(helper.OrderActivityRiderEnrouteToVendor),
				Details:  "Rider is en route to pick up your order.",
				Time:     time.Now().String(),
			}, "buyer", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityRiderEnrouteToVendor),
				Subtitle: string(helper.OrderActivityRiderEnrouteToVendor),

				Details: "Rider is en route to pick up your order.",
				Time:    time.Now().String(),
			}, "seller", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			item.Status = string(helper.OrderStatusProcessing)
			item.StatusUpdatedAt = time.Now()

			_, err = s.orderRepo.UpdateOrderItem(item.ID, item, false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

		}
	case "picked_up":
		for _, item := range items {
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityOrderPickedup),
				Subtitle: "Order Picked Up & In Transit",
				Details:  "Your order is on the way to the delivery location.",
				Time:     time.Now().String(),
			}, "buyer", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityOrderPickedup),
				Subtitle: "Order Picked Up & In Transit",

				Details: "Your order is on the way to the delivery location.",
				Time:    time.Now().String(),
			}, "seller", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			// NS2 buyer.item.shipped (courier picked up = on its way). In-app.
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.item.shipped",
				UserID: order.UserID,
				Vars:   map[string]string{"item": s.productTitle(item.ProductID), "itemId": item.ID},
			})
		}
	case "in_transit":
		for _, item := range items {
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityOrderInTransit),
				Subtitle: "Out for Delivery",
				Details:  "Your order is out for delivery.",
				Time:     time.Now().String(),
			}, "buyer", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityOrderInTransit),
				Subtitle: "Out for Delivery",
				Details:  "Your order is out for delivery.",
				Time:     time.Now().String(),
			}, "seller", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			item.Status = string(helper.OrderStatusShipped)
			item.StatusUpdatedAt = time.Now()
			_, err = s.orderRepo.UpdateOrderItem(item.ID, item, false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			// NS2 buyer.item.in_transit (ambient, in-app).
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.item.in_transit",
				UserID: order.UserID,
				Vars:   map[string]string{"item": s.productTitle(item.ProductID), "itemId": item.ID},
			})
		}
	case "completed":
		for _, item := range items {
			// Shipbubble webhook is a non-guest path (shipment/items/order all
			// looked up in the authed tables above).
			//
			// R3 idempotency: webhooks are at-least-once. Atomically claim the
			// delivered transition so a redelivered "completed" event is a no-op —
			// only the winning call credits the seller.
			prevStatus, prevStatusAt := item.Status, item.StatusUpdatedAt
			claimed, cerr := s.orderRepo.ClaimOrderItemDelivered(item.ID, false)
			if cerr != nil {
				return fmt.Errorf("something went wrong")
			}
			if !claimed {
				continue // already delivered — skip credit + duplicate activities
			}
			if err := s.walletService.MoveToClearingFromOrders(&item, float64(item.Quantity)*item.Price, false); err != nil {
				// Roll the claim back so funds are never left delivered-without-credit.
				_, _ = s.orderRepo.UpdateOrderItemStatus(item.ID, prevStatus, prevStatusAt, false)
				return fmt.Errorf("something went wrong")
			}
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityDelivered),
				Subtitle: string(helper.OrderActivityDelivered),
				Details:  "Your order has been successfully delivered.",
				Time:     time.Now().String(),
			}, "buyer", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityDelivered),
				Subtitle: string(helper.OrderActivityDelivered),
				Details:  "Your order has been successfully delivered.",
				Time:     time.Now().String(),
			}, "seller", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			item.Status = string(helper.OrderStatusDelivered)
			item.StatusUpdatedAt = time.Now()
			_, err = s.orderRepo.UpdateOrderItem(item.ID, item, false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			// NS2 buyer.item.delivered (in-app). Only the buyer notification is
			// re-pointed here — the wallet move in this "completed" case is untouched.
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.item.delivered",
				UserID: order.UserID,
				Vars:   map[string]string{"item": s.productTitle(item.ProductID), "itemId": item.ID},
			})
		}
	case "cancelled":
		for _, item := range items {
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityCancelled),
				Subtitle: string(helper.OrderActivityCancelled),
				Details:  "Your order has been canceled.",
				Time:     time.Now().String(),
			}, "buyer", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityCancelled),
				Subtitle: string(helper.OrderActivityCancelled),
				Details:  "Your order has been canceled.",
				Time:     time.Now().String(),
			}, "seller", false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}
			item.Status = string(helper.OrderStatusCancelled)
			item.StatusUpdatedAt = time.Now()
			_, err = s.orderRepo.UpdateOrderItem(item.ID, item, false)
			if err != nil {
				return fmt.Errorf("something went wrong")
			}

			// NS2 buyer.item.cancelled (in-app).
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.item.cancelled",
				UserID: order.UserID,
				Vars:   map[string]string{"item": s.productTitle(item.ProductID), "itemId": item.ID},
			})
		}
	}
	return nil
}

func (s *WebhookService) TwilioMessageStatus(payload requests.TwilioMessageStatus) error {
	data, err := s.TwilioCacheRepository.GetOne(
		map[string]interface{}{"message_sid": payload.MessageSid},
	)
	if err != nil {
		logger.Error(fmt.Sprintf("error fetching cache record: %v", err))
		return err
	}

	if data.Status != payload.MessageStatus {
		data.Status = payload.MessageStatus
		_, err = s.TwilioCacheRepository.Update(data.ID, *data)
		if err != nil {
			logger.Error(fmt.Sprintf("error updating cache status: %v", err))
			return err
		}
	}

	if data.Channel == "whatsapp" &&
		(payload.MessageStatus == "failed" || payload.MessageStatus == "undelivered") {

		if err := s.twilioService.SendOTP(data.To, data.OTP, "sms", ""); err != nil {
			logger.Error(fmt.Sprintf("error retrying SMS OTP: %v", err))
			return err
		}

		data.Channel = "sms"
		_, err = s.TwilioCacheRepository.Update(data.ID, *data)
		if err != nil {
			logger.Error(fmt.Sprintf("error updating cache channel: %v", err))
			return err
		}
	}

	return nil
}
