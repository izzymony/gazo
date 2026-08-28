package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/payments"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type TransactionService struct {
	db                  *gorm.DB
	transactionRepo     ports.TransactionRepoInterface
	orderRepo           ports.OrderRepoInterface
	userRepo            ports.UserRepoInterface
	productRepo         ports.ProductRepoIface
	walletService       *WalletService
	payments            payments.Paystack
	shippingService     *ShippingService
	notificationService *NotificationService
	orderService        *OrderService
	referralService     *ReferralService
	dispatcher          *NotificationDispatcher
}

func NewTransactionService(db *gorm.DB) *TransactionService {
	return &TransactionService{
		db:                  db,
		transactionRepo:     mysql_repo.NewTransactionRepository(db),
		orderRepo:           mysql_repo.NewOrderRepository(db),
		userRepo:            mysql_repo.NewUserRepository(db),
		productRepo:         mysql_repo.NewProductRepository(db),
		shippingService:     NewShippingService(db),
		payments:            payments.NewPaystackPaymentService(db),
		walletService:       NewWalletService(db),
		orderService:        NewOrderService(db),
		notificationService: NewNotificationService(db),
		referralService:     NewReferralService(db),
		dispatcher:          NewNotificationDispatcher(db),
	}
}

func (s *TransactionService) GetAll(userId string, isGuest bool, page, limit int) ([]domain.Transaction, int64, error) {
	filters := map[string]interface{}{
		"user_id": userId,
	}

	transactions, total, err := s.transactionRepo.GetAll(filters, isGuest, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	return transactions, total, nil
}

func (s *TransactionService) FetchOne(id string, userId string, isGuest bool) (*domain.Transaction, error) {
	transaction, err := s.transactionRepo.GetOne(map[string]interface{}{"id": id}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if transaction == nil {
		return nil, nil
	}
	if transaction.UserId != userId {
		return nil, fmt.Errorf("userId mismatch")
	}
	return transaction, nil
}

func (s *TransactionService) Initiate(input requests.InitiateTransaction, userId string, isGuest bool) (*payments.InitiateResponse, error) {
	order, err := s.orderRepo.GetOneOrder(map[string]interface{}{
		"invoice": input.Invoice,
		"user_id": userId,
	}, isGuest)
	if err != nil || order == nil {
		log.Println(err)
		return nil, errors.New("reference not found")
	}

	if order.Total != input.Amount {
		return nil, errors.New("invalid amount")
	}

	transaction, err := s.transactionRepo.Create(&domain.Transaction{
		Reference: input.Invoice,
		UserId:    userId,
		Amount:    input.Amount,
	}, isGuest)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	var email string
	if user != nil {
		email = user.Email
	}
	if email == "" {
		email = input.Email
	}
	if email == "" {
		return nil, errors.New("please provide a valid email")
	}
	// send transaction to paystack
	paymentResponse, err := s.payments.Initiate(email, input.Invoice, int32(math.Round(input.Amount)), input.RedirectURL)
	if err != nil {
		// s.transactionRepo.Delete(transaction.ID)
		return nil, err
	}

	initData := payments.InitiateResponse{}

	transaction.ExternalReference = paymentResponse.Data.Reference
	transaction.Status = string(helper.PaymentPending)

	_, err = s.transactionRepo.Update(transaction.ID, *transaction, isGuest)
	if err != nil {
		return nil, err
	}

	helper.Copy(paymentResponse.Data, &initData)
	initData.TransactionId = transaction.ID
	return &initData, nil
}

// InitiateCheckout is the order-on-success entry point: validate the cart (no
// persist), store it as the transaction payload, and initiate payment. The order
// is created from the payload on charge.success (Verify), so a failed/abandoned
// payment leaves no order. Replaces the createOrders -> Initiate pair.
func (s *TransactionService) InitiateCheckout(input requests.InitiateCheckout, userId string, isGuest bool) (*payments.InitiateResponse, error) {
	// Validate + build the order (no persist). Mints the invoice. Clamps the rewards-
	// credit intent (guest-reject, ≤50%, whole Naira) — the atomic reserve below is
	// the authority for the real amount.
	order, err := s.orderService.ValidateOrder(input.Order, userId, isGuest)
	if err != nil {
		return nil, err
	}

	email := input.Email
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": userId}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if user != nil && user.Email != "" {
		email = user.Email
	}
	if email == "" {
		return nil, errors.New("please provide a valid email")
	}

	gross := math.Round(input.Total) // whole Naira; the value the seller fulfils
	creditIntent := 0.0
	if !isGuest && order.CreditApplied > 0 {
		creditIntent = order.CreditApplied // whole-Naira clamped in ValidateOrder
	}

	// RW1: reserve the credit + create the pending transaction in ONE short DB tx
	// that COMMITS before the Paystack call — never hold a DB tx open across the
	// network round-trip. The transaction's Amount is the CASH charged (gross minus
	// the actual reserved credit); the payload keeps the gross order + the
	// authoritative CreditApplied.
	var transaction *domain.Transaction
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		var sUsed, wUsed float64
		if creditIntent > 0 {
			refRepo := mysql_repo.NewReferralRepository(tx)
			s2, w2, rerr := refRepo.ReserveCredit(userId, creditIntent)
			if rerr != nil {
				if errors.Is(rerr, mysql_repo.ErrInsufficientCredit) {
					// Never silently under-apply — reject so the buyer is never charged
					// more than the "You pay" they saw.
					return fmt.Errorf("your rewards balance changed — please refresh and try again")
				}
				return rerr
			}
			sUsed, wUsed = s2, w2
			if err := refRepo.CreateCreditEntry(&domain.CreditEntry{
				UserID: userId, Amount: -(sUsed + wUsed),
				Type: domain.CreditTypeReservation, Source: domain.CreditSourceCheckout,
				OrderID:     order.Invoice,
				Description: fmt.Sprintf("Reserved ₦%.0f rewards credit at checkout", sUsed+wUsed),
			}); err != nil {
				return err
			}
		}
		order.CreditApplied = sUsed + wUsed // authoritative = actual reserved
		payloadMap, perr := orderToMap(*order)
		if perr != nil {
			return perr
		}
		created, cerr := mysql_repo.NewTransactionRepository(tx).Create(&domain.Transaction{
			Reference:                  order.Invoice,
			UserId:                     userId,
			Amount:                     gross - (sUsed + wUsed),
			Status:                     string(helper.PaymentPending),
			Payload:                    payloadMap,
			CreditReservedShopping:     sUsed,
			CreditReservedWithdrawable: wUsed,
		}, isGuest)
		if cerr != nil {
			return cerr
		}
		transaction = created
		return nil
	})
	if txErr != nil {
		return nil, txErr
	}

	// Paystack — OUTSIDE any DB tx.
	paymentResponse, err := s.payments.Initiate(email, order.Invoice, int32(transaction.Amount), input.RedirectURL)
	if err != nil {
		// Synchronous release: refund the held credit immediately (new short tx) so
		// the buyer's balance is restored now, not after the reconcile cron.
		s.releaseReservation(transaction.ID, isGuest)
		return nil, err
	}

	transaction.ExternalReference = paymentResponse.Data.Reference
	transaction.Status = string(helper.PaymentPending)
	if _, err = s.transactionRepo.Update(transaction.ID, *transaction, isGuest); err != nil {
		return nil, err
	}

	initData := payments.InitiateResponse{}
	helper.Copy(paymentResponse.Data, &initData)
	initData.TransactionId = transaction.ID
	return &initData, nil
}

// releaseReservation refunds a transaction's held rewards credit EXACTLY ONCE
// (payment init-failed / failed / expired). Concurrency-safe + idempotent via
// ClaimReservationRelease, and it never touches a converted reservation. Runs in its
// own short tx, so it is safe from the synchronous init-failure path, MarkFailed, and
// the reconcile cron.
func (s *TransactionService) releaseReservation(txnID string, isGuest bool) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		txTxnRepo := mysql_repo.NewTransactionRepository(tx)
		won, cerr := txTxnRepo.ClaimReservationRelease(txnID, isGuest)
		if cerr != nil {
			return cerr
		}
		if !won {
			return nil // no live hold, or already converted/released
		}
		t, gerr := txTxnRepo.GetOne(map[string]interface{}{"id": txnID}, isGuest)
		if gerr != nil || t == nil {
			return gerr
		}
		refRepo := mysql_repo.NewReferralRepository(tx)
		if rerr := refRepo.RefundCredit(t.UserId, t.CreditReservedShopping, t.CreditReservedWithdrawable); rerr != nil {
			return rerr
		}
		reserved := t.CreditReservedShopping + t.CreditReservedWithdrawable
		return refRepo.CreateCreditEntry(&domain.CreditEntry{
			UserID: t.UserId, Amount: reserved,
			Type: domain.CreditTypeReservationRelease, Source: domain.CreditSourceCheckout,
			OrderID:     t.Reference,
			Description: fmt.Sprintf("Released ₦%.0f reserved rewards credit (payment not completed)", reserved),
		})
	})
	if err != nil {
		log.Printf("releaseReservation failed for txn %s: %v", txnID, err)
	}
}

// orderToMap serialises a fully-validated order (resolved business IDs + locked
// prices) into the transaction payload (JSON), reconstructed at Verify to create
// the order once payment is confirmed — without re-validating live product state.
func orderToMap(order domain.Order) (domain.Map, error) {
	b, err := json.Marshal(order)
	if err != nil {
		return nil, err
	}
	var m domain.Map
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// mapToOrder reconstructs the validated order from a transaction payload (JSON),
// so it can be persisted as-is at charge.success (no live re-validation).
func mapToOrder(m domain.Map) (domain.Order, error) {
	var out domain.Order
	b, err := json.Marshal(m)
	if err != nil {
		return out, err
	}
	err = json.Unmarshal(b, &out)
	return out, err
}

func (s *TransactionService) Verify(input requests.VerifyTransaction, isGuest bool) (interface{}, error) {
	transaction, err := s.transactionRepo.GetOne(map[string]interface{}{
		"reference": input.Reference,
	}, isGuest)
	if err != nil {
		return nil, err
	}

	// Legacy order-first: the order already exists (keyed by invoice). For
	// order-on-success (payload present) the order does not exist yet — it is
	// created below once payment is confirmed.
	var order *domain.Order
	if len(transaction.Payload) == 0 {
		order, err = s.orderRepo.GetOneOrder(map[string]interface{}{
			"invoice": transaction.Reference,
			"user_id": transaction.UserId,
		}, isGuest)
		if err != nil || order == nil {
			log.Println(err)
			return nil, errors.New("reference not found")
		}
	}

	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": transaction.UserId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}

	// send transaction to paystack
	paymentResponse, err := s.payments.Verify(transaction.ExternalReference)
	if err != nil {
		return nil, err
	}

	// fmt.Println("paymentResponse.Data.Status; ", paymentResponse.Data.Status)

	if paymentResponse.Data.Status == string(helper.PaymentSuccessful) {
		// RW1: verify Paystack actually charged the EXPECTED cash (gross minus
		// reserved credit), in kobo, before creating the order — guards against an
		// amount that doesn't match what we asked to charge. On mismatch: create no
		// order, release any held credit, and fail.
		expectedKobo := int(math.Round(transaction.Amount)) * 100
		if paymentResponse.Data.Amount != expectedKobo {
			s.releaseReservation(transaction.ID, isGuest)
			_ = s.transactionRepo.SetStatus(transaction.ID, string(helper.PaymentFailed), isGuest)
			return nil, fmt.Errorf("payment amount mismatch")
		}

		// R6: run the confirm->credit sequence in ONE DB transaction so a mid-loop
		// failure can't leave some items credited and others not. Any error rolls
		// the whole thing back (including the payment claim), so the reconcile cron
		// or a client retry re-processes cleanly. Paystack verify (above) and the
		// best-effort notifications + referral (below) stay outside the tx.
		var alreadyProcessed bool
		txErr := s.db.Transaction(func(tx *gorm.DB) error {
			txTxnRepo := mysql_repo.NewTransactionRepository(tx)
			txOrderRepo := mysql_repo.NewOrderRepository(tx)
			txProductRepo := mysql_repo.NewProductRepository(tx)
			txOrderService := NewOrderService(tx)
			txWallet := NewWalletService(tx)

			if len(transaction.Payload) > 0 {
				// Order-on-success: atomically claim the transaction (pending->success)
				// so exactly ONE racing verify/webhook creates the order.
				claimed, err := txTxnRepo.ClaimPending(transaction.ID, isGuest)
				if err != nil {
					return fmt.Errorf("failed to update transaction")
				}
				if !claimed {
					alreadyProcessed = true
					return nil
				}
				orderInput, err := mapToOrder(transaction.Payload)
				if err != nil {
					return err
				}
				order, err = txOrderService.CreateFromValidated(&orderInput, isGuest)
				if err != nil {
					return err
				}
				if _, err := txOrderRepo.ClaimPaymentReceived(order.ID, isGuest); err != nil {
					return fmt.Errorf("failed to update order")
				}
			} else {
				// Legacy order-first: the order-claim is the idempotency gate.
				claimed, err := txOrderRepo.ClaimPaymentReceived(order.ID, isGuest)
				if err != nil {
					return fmt.Errorf("failed to update order")
				}
				if !claimed {
					alreadyProcessed = true
					return nil
				}
			}
			order.PaymentReceived = true

			// RW1: convert the rewards-credit reservation atomically with the order.
			// The balance was decremented at reserve; stamp converted so it can never
			// be released. No-op when nothing was reserved (guest / no credit / legacy).
			// Exactly-once via the ClaimPending gate above. NOTE: the seller is settled
			// on the FULL item price below (CreditForOrderInProgress uses item.Price) —
			// credit is a platform-funded discount to the buyer, not to the seller.
			if transaction.CreditReservedShopping > 0 || transaction.CreditReservedWithdrawable > 0 {
				if err := txTxnRepo.MarkReservationConverted(transaction.ID, isGuest); err != nil {
					return err
				}
			}

			for _, item := range order.Items {
				if err := txWallet.CreditForOrderInProgress(&item, float64(item.Quantity)*item.Price, isGuest); err != nil {
					return err
				}
				if _, err := txOrderRepo.AppendActivity(item.ID, domain.OrderActivity{
					Title:    string(helper.OrderActivityPaymentConfirmed),
					Subtitle: string(helper.OrderActivityPaymentConfirmed),
					Details:  "Payment has been confirmed.",
					Time:     time.Now().String(),
				}, "buyer", isGuest); err != nil {
					return fmt.Errorf("something went wrong")
				}
				newUpdatedItem, err := txOrderRepo.AppendActivity(item.ID, domain.OrderActivity{
					Title:    string(helper.OrderActivityPaymentConfirmed),
					Subtitle: string(helper.OrderActivityPaymentConfirmed),
					Details:  "Payment has been confirmed.",
					Time:     time.Now().String(),
				}, "seller", isGuest)
				if err != nil {
					return fmt.Errorf("something went wrong")
				}
				newUpdatedItem.Status = string(helper.OrderStatusPaymentConfirmed)
				newUpdatedItem.StatusUpdatedAt = time.Now()
				// R7: guest items live in order_items_guest — pass isGuest so a guest
				// checkout's item actually flips to payment_confirmed.
				if _, err := txOrderRepo.UpdateOrderItem(newUpdatedItem.ID, *newUpdatedItem, isGuest); err != nil {
					return fmt.Errorf("something went wrong")
				}
				if err := txProductRepo.IncrementProductSales(item.ProductID, item.Quantity); err != nil {
					return fmt.Errorf("something went wrong")
				}
				if err := txProductRepo.DecrementProductStock(item.ProductID, item.Quantity); err != nil {
					return fmt.Errorf("something went wrong")
				}
			}
			return nil
		})
		if txErr != nil {
			return nil, txErr
		}
		if alreadyProcessed {
			// Another verify / the webhook already settled this payment (idempotent).
			return nil, nil
		}

		// Best-effort, post-commit: per-item seller notifications + stock alerts.
		for _, item := range order.Items {
			product, perr := s.productRepo.GetOne(map[string]interface{}{"id": item.ProductID})
			if perr != nil || product == nil {
				continue
			}
			_ = s.dispatcher.EmitToBusiness(context.Background(), item.BusinessID, EmitInput{
				Event: "seller.sale.new_order",
				Vars: map[string]string{
					"item":   product.Title,
					"qty":    fmt.Sprintf("%d", item.Quantity),
					"amount": FormatNaira(float64(item.Quantity) * item.Price),
					"itemId": item.ID,
				},
			})
			_ = s.dispatcher.EmitToBusiness(context.Background(), item.BusinessID, EmitInput{
				Event: "seller.payment.confirmed",
				Vars:  map[string]string{"item": product.Title, "itemId": item.ID},
			})
			if product.Stock != nil {
				if *product.Stock == 0 {
					_ = s.dispatcher.EmitToBusiness(context.Background(), product.BusinessID, EmitInput{
						Event: "seller.inventory.sold_out",
						Vars:  map[string]string{"item": product.Title, "productId": product.ID},
					})
				} else if *product.Stock < 3 {
					_ = s.dispatcher.EmitToBusiness(context.Background(), product.BusinessID, EmitInput{
						Event: "seller.inventory.low_stock",
						Vars:  map[string]string{"item": product.Title, "qty": fmt.Sprintf("%d", *product.Stock), "productId": product.ID},
					})
				}
			}
		}

		_ = s.dispatcher.Emit(context.Background(), EmitInput{
			Event:  "buyer.payment.confirmed",
			UserID: order.UserID,
			Vars:   map[string]string{"total": FormatNaira(order.Total)},
		})

		// Activate referral (best-effort, its own tx) after the money is committed.
		if !isGuest && user != nil && user.ReferredByUsername != "" && !user.ReferralActivated {
			if err := s.referralService.ActivateReferral(user.ID, order.ID); err != nil {
				log.Printf("Referral activation failed for user %s: %v", user.ID, err)
			}
		}
	}

	transaction.Status = paymentResponse.Data.Status

	updated, err := s.transactionRepo.Update(transaction.ID, *transaction, isGuest)
	if err != nil {
		return nil, err
	}

	// The client treats a 2xx verify as "payment confirmed" and a non-2xx as
	// failure. Record the real Paystack status above, then surface a non-success
	// status (abandoned / failed / reversed …) as an error so the buyer sees the
	// failure path (return to review + toast) instead of the success screen, and
	// no order is created. Success returns the updated transaction (200).
	if paymentResponse.Data.Status != string(helper.PaymentSuccessful) {
		return nil, fmt.Errorf("payment not successful: %s", paymentResponse.Data.Status)
	}

	return updated, nil
}

// MarkFailed records a transaction as failed (from the charge.failed webhook).
// In the order-on-success flow no order exists yet, so this only stops the
// pending-GC from re-sweeping it; on the legacy path the order simply stays
// un-credited. Idempotent, and it never overrides a transaction that already
// settled as success. Checks the live table first, then the guest twin.
func (s *TransactionService) MarkFailed(reference string) error {
	for _, isGuest := range []bool{false, true} {
		transaction, err := s.transactionRepo.GetOne(map[string]interface{}{"reference": reference}, isGuest)
		if err != nil || transaction == nil {
			continue // not in this table — try the twin
		}
		if transaction.Status == string(helper.PaymentSuccessful) {
			return nil // already settled — do not override a success
		}
		if err := s.transactionRepo.SetStatus(transaction.ID, string(helper.PaymentFailed), isGuest); err != nil {
			return err
		}
		// RW1: a failed payment releases any held rewards credit (idempotent).
		s.releaseReservation(transaction.ID, isGuest)
		return nil
	}
	return nil // unknown reference — nothing to fail
}

// ExpireIfPending marks a still-pending transaction as expired (the pending-GC
// backstop for payments the customer abandoned before paying). Conditional at
// the SQL layer, so it never overrides a status a concurrent verify just settled.
func (s *TransactionService) ExpireIfPending(id string, isGuest bool) error {
	if err := s.transactionRepo.ExpireIfPending(id, isGuest); err != nil {
		return err
	}
	// RW1: an expired (abandoned) checkout releases any held rewards credit. Idempotent
	// + guards against a converted reservation, so this is a no-op if a concurrent
	// verify already settled + converted it.
	s.releaseReservation(id, isGuest)
	return nil
}
