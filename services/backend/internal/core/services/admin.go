package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"vibaar/backend/internal/adapter/api/requests"
	mysql_repo "vibaar/backend/internal/adapter/repositories/sql"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/core/external_service/payments"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"
	"vibaar/backend/internal/ports"
)

type AdminService struct {
	businessRepo          ports.BusinessIface
	userRepo              ports.UserRepoInterface
	orderRepo             ports.OrderRepoInterface
	adminRepo             ports.AdminInterface
	walletRepo            ports.WalletInterface
	productRepo           ports.ProductRepoIface
	kycRepo               ports.KYCRepoInterface
	withdrawalRequestRepo ports.WithdrawalRequestInterface
	shippingRepo          ports.ShippingInterface
	notificationRepo      ports.NotificationInterface
	payments              payments.Paystack
	walletService         *WalletService
	notificationService   *NotificationService
	dispatcher            *NotificationDispatcher
	db                    *gorm.DB
}

func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{
		businessRepo:          mysql_repo.NewBusinessRepository(db),
		userRepo:              mysql_repo.NewUserRepository(db),
		adminRepo:             mysql_repo.NewAdminRepository(db),
		walletRepo:            mysql_repo.NewWalletRepository(db),
		orderRepo:             mysql_repo.NewOrderRepository(db),
		productRepo:           mysql_repo.NewProductRepository(db),
		withdrawalRequestRepo: mysql_repo.NewWithdrawalRequestRepository(db),
		kycRepo:               mysql_repo.NewKYCRepository(db),
		shippingRepo:          mysql_repo.NewShippingRepository(db),
		notificationRepo:      mysql_repo.NewNotificationRepository(db),
		payments:              payments.NewPaystackPaymentService(db),
		walletService:         NewWalletService(db),
		notificationService:   NewNotificationService(db),
		dispatcher:            NewNotificationDispatcher(db),
		db:                    db,
	}
}

// DashboardStats is the platform-wide summary for the admin dashboard +
// analytics pages. Field json tags match what the admin client already expects
// (GET /admin/dashboard/stats).
type DashboardStats struct {
	TotalUsers         int64   `json:"total_users"`
	TotalBusinesses    int64   `json:"total_businesses"`
	TotalProducts      int64   `json:"total_products"`
	TotalOrders        int64   `json:"total_orders"`
	TotalRevenue       float64 `json:"total_revenue"`
	PendingWithdrawals int64   `json:"pending_withdrawals"`
	PendingKYC         int64   `json:"pending_kyc"`
}

// GetDashboardStats computes the admin summary counts. Revenue is COLLECTED
// money only — the sum of successful transactions — so abandoned/expired
// checkout amounts (which can dwarf real revenue) never inflate the figure.
func (s *AdminService) GetDashboardStats() (DashboardStats, error) {
	var stats DashboardStats
	s.db.Model(&domain.User{}).Count(&stats.TotalUsers)
	s.db.Model(&domain.Business{}).Count(&stats.TotalBusinesses)
	s.db.Model(&domain.Product{}).Count(&stats.TotalProducts)
	s.db.Model(&domain.Order{}).Count(&stats.TotalOrders)
	s.db.Model(&domain.Transaction{}).
		Where("status = ?", string(helper.PaymentSuccessful)).
		Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalRevenue)
	s.db.Model(&domain.WithdrawalRequest{}).Where("status = ?", "pending").Count(&stats.PendingWithdrawals)
	s.db.Model(&domain.KYC{}).Where("status = ?", "pending").Count(&stats.PendingKYC)
	return stats, nil
}

func (s *AdminService) Login(input requests.LoginRequest) (interface{}, error) {
	admin, err := s.adminRepo.GetOne(map[string]interface{}{"email": input.Identifier})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error checking email: %w", err)
	}
	if admin == nil || admin.ID == "" {
		return nil, errors.New("invalid admin")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(input.Password)); err != nil {
		return nil, errors.New("incorrect password")
	}

	token, err := helper.GenerateJWT(helper.SignedDetails{
		Email:   admin.Email,
		UserId:  admin.ID,
		IsAdmin: true,
	})
	if err != nil {
		return nil, err
	}

	admin.Password = ""
	return map[string]interface{}{
		"data":  admin,
		"token": token,
	}, nil
}

func (s *AdminService) ApproveWithdrawal(requestID string) error {
	var sellerID, bankLabel string
	var amount float64
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Fetch and lock withdrawal request to prevent concurrent modifications
		var withdrawalRequest domain.WithdrawalRequest
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", requestID).First(&withdrawalRequest).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("request not found")
			}
			return fmt.Errorf("failed to fetch request: %w", err)
		}

		// 2. Idempotency check - prevent double approval
		if withdrawalRequest.Status != "pending" {
			return fmt.Errorf("withdrawal already %s", withdrawalRequest.Status)
		}

		// 3. Fetch and lock wallet to prevent concurrent balance changes
		var wallet domain.Wallet
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", withdrawalRequest.WalletID).First(&wallet).Error; err != nil {
			return fmt.Errorf("wallet not found: %w", err)
		}

		// 4. Verify bank account exists
		bankAccountDetails, err := s.businessRepo.FindAccountDetailsByIDAndBusiness(withdrawalRequest.BankAccountDetailsID, wallet.BusinessID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("failed to fetch bank account: %w", err)
		}
		if bankAccountDetails == nil {
			return fmt.Errorf("bank account not found")
		}
		sellerID = withdrawalRequest.UserID
		amount = withdrawalRequest.Amount
		bankLabel = bankAccountDetails.Bank
		if len(bankAccountDetails.AccountNumber) >= 4 {
			bankLabel = bankAccountDetails.Bank + " ••" + bankAccountDetails.AccountNumber[len(bankAccountDetails.AccountNumber)-4:]
		}

		// 5. Atomically update wallet balances:
		//    - Deduct from available_balance
		//    - Unlock from pending_withdrawals
		//    - Increment total_withdrawn
		if err := tx.Model(&wallet).Updates(map[string]interface{}{
			"available_balance":   gorm.Expr("available_balance - ?", withdrawalRequest.Amount),
			"pending_withdrawals": gorm.Expr("pending_withdrawals - ?", withdrawalRequest.Amount),
			"total_withdrawn":     gorm.Expr("total_withdrawn + ?", withdrawalRequest.Amount),
		}).Error; err != nil {
			return fmt.Errorf("failed to update wallet: %w", err)
		}

		// 6. Create wallet transaction record for audit trail
		transaction := &domain.WalletTransaction{
			WalletID:        withdrawalRequest.WalletID,
			Type:            string(helper.WithdrawalTransactionType),
			TypeDescription: "Withdrawal approved",
			Amount:          withdrawalRequest.Amount,
			Reference:       withdrawalRequest.Reference,
			Status:          "completed",
			BalanceBefore:   wallet.AvailableBalance,
			BalanceAfter:    wallet.AvailableBalance - withdrawalRequest.Amount,
			Beneficiary:     bankAccountDetails.AccountName,
			From:            "Vibaar Wallet",
			To:              fmt.Sprintf("%s - %s", bankAccountDetails.Bank, bankAccountDetails.AccountNumber),
		}
		if err := tx.Create(transaction).Error; err != nil {
			logger.Error(fmt.Sprintf("failed to create wallet transaction: %v", err))
		}

		// 7. Update withdrawal request status to completed
		return tx.Model(&withdrawalRequest).Update("status", "completed").Error
	})
	if err != nil {
		return err
	}

	// NS2 seller.payout.withdrawal_sent — post-commit, best-effort, money untouched.
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.payout.withdrawal_sent",
		UserID: sellerID,
		Vars:   map[string]string{"amount": FormatNaira(amount), "bank": bankLabel},
	})
	return nil
}

func (s *AdminService) RejectWithdrawal(requestID, reason string) error {
	var sellerID string
	var amount float64
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Fetch and lock withdrawal request
		var withdrawalRequest domain.WithdrawalRequest
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", requestID).First(&withdrawalRequest).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("request not found")
			}
			return fmt.Errorf("failed to fetch request: %w", err)
		}

		// 2. Idempotency check
		if withdrawalRequest.Status != "pending" {
			return fmt.Errorf("withdrawal already %s", withdrawalRequest.Status)
		}
		sellerID = withdrawalRequest.UserID
		amount = withdrawalRequest.Amount

		// 3. Unlock pending balance (release the reserved funds back to available)
		if err := tx.Model(&domain.Wallet{}).
			Where("id = ?", withdrawalRequest.WalletID).
			Update("pending_withdrawals", gorm.Expr("pending_withdrawals - ?", withdrawalRequest.Amount)).Error; err != nil {
			return fmt.Errorf("failed to unlock balance: %w", err)
		}

		// 4. Update withdrawal request status with rejection reason
		return tx.Model(&withdrawalRequest).Updates(map[string]interface{}{
			"status": "rejected",
			"reason": reason,
		}).Error
	})
	if err != nil {
		return err
	}

	// NS2 seller.payout.withdrawal_failed — post-commit, best-effort, money untouched.
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.payout.withdrawal_failed",
		UserID: sellerID,
		Vars:   map[string]string{"amount": FormatNaira(amount)},
	})
	return nil
}

func (s *AdminService) GetAllWithdrawalRequests(limit, page int) ([]domain.WithdrawalRequest, int64, error) {
	offset := (page - 1) * limit
	return s.withdrawalRequestRepo.GetAll(limit, offset)
}

func (s *AdminService) GetWithdrawalRequestByID(id string) (*domain.WithdrawalRequest, error) {
	return s.withdrawalRequestRepo.FindByID(id)
}

func (s *AdminService) GetAllOrders(page, limit int) ([]domain.Order, int64, error) {
	items, totalItems, err := s.orderRepo.GetAllOrdersPaginated(nil, false, page, limit)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong fetching order items")
	}

	return items, totalItems, nil
}

// GetAllOrderItemsList returns all order items (matching seller dashboard format)
func (s *AdminService) GetAllOrderItemsList(page, limit int) ([]domain.OrderItem, int64, error) {
	items, total, err := s.orderRepo.GetAllOrderItemsPaginated(nil, false, page, limit)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("error fetching order items")
	}
	return items, total, nil
}

func (s *AdminService) GetAllBusinesses(search string, page, limit int) ([]domain.Business, int64, error) {
	businesses, totalItems, err := s.businessRepo.GetAllBusinesses(search, page, limit)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	return businesses, totalItems, nil
}

func (s *AdminService) GetBusiness(id string) (*domain.Business, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": id})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	return business, nil
}

func (s *AdminService) GetAllUsers(search string, page, limit int) ([]domain.User, int64, error) {
	users, totalItems, err := s.userRepo.GetAllUsers(search, page, limit)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	for i := 0; i < len(users); i++ {
		users[i].Password = ""
	}

	return users, totalItems, nil
}

func (s *AdminService) GetUser(id string) (*domain.User, error) {
	var (
		user *domain.User
		err  error
	)
	user, err = s.userRepo.GetOne(map[string]interface{}{"id": id}, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if user == nil {
		user, err = s.userRepo.GetOne(map[string]interface{}{"id": id}, true)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong")
		}
	}
	user.Password = ""

	return user, nil
}

func (s *AdminService) GetOrderItems(orderId string, page, limit int) ([]domain.OrderItem, int64, error) {
	items, totalItems, err := s.orderRepo.GetAllOrderItemsPaginated(
		map[string]interface{}{"order_id": orderId}, false, page, limit,
	)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong fetching order items")
	}
	return items, totalItems, nil

}

func (s *AdminService) GetOrderItem(itemId string) (*domain.OrderItem, error) {
	item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{
		"id": itemId,
	}, false)
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (s *AdminService) GetAllProducts(search string, page, limit int) ([]domain.Product, int64, error) {
	products, totalItems, err := s.productRepo.GetAllPaginated(nil, search, page, limit)
	if err != nil {
		return nil, 0, errors.New("error fetching products")
	}

	return products, totalItems, nil
}

func (s *AdminService) GetOneProduct(id string) (*domain.Product, error) {
	product, err := s.productRepo.GetOne(map[string]interface{}{"id": id})
	if err != nil {
		return nil, errors.New("error fetching product")
	}
	return product, nil
}

func (s *AdminService) GetOneBusiness(id string) (*domain.Business, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": id})
	if err != nil {
		return nil, errors.New("error fetching business")
	}
	return business, nil
}

func (s *AdminService) UpdateUser(id string, data map[string]interface{}) error {
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": id}, false)
	isGuest := false

	if errors.Is(err, gorm.ErrRecordNotFound) || user == nil {
		user, err = s.userRepo.GetOne(map[string]interface{}{"id": id}, true)
		isGuest = true
	}
	if err != nil {
		return fmt.Errorf("user not found")
	}

	if err := s.userRepo.UpdateUser(id, data, isGuest); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

func (s *AdminService) DeleteUser(id string) error {
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": id}, false)
	isGuest := false

	if errors.Is(err, gorm.ErrRecordNotFound) || user == nil {
		user, err = s.userRepo.GetOne(map[string]interface{}{"id": id}, true)
		isGuest = true
	}
	if err != nil {
		return fmt.Errorf("user not found")
	}

	// CASCADE DELETE: Delete all associated data before deleting user

	// 1. Find and delete user's business and related data
	business, _ := s.businessRepo.GetOne(map[string]interface{}{"user_id": id})
	if business != nil && business.ID != "" {
		// Delete all products belonging to this business
		products, _ := s.productRepo.GetAll(map[string]interface{}{"business_id": business.ID})
		for _, product := range products {
			// Delete product variants first
			s.productRepo.DeleteVariantsByProductID(product.ID)
			// Delete the product
			s.productRepo.Delete(product.ID)
		}

		// Delete the business
		s.businessRepo.Delete(business.ID)
	}

	// 2. Delete the user
	if err := s.userRepo.DeleteUser(id, isGuest); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

func (s *AdminService) GetWalletTransactions(businessId string, transactionType string, page, limit int) ([]domain.WalletTransaction, int64, error) {
	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"business_id": businessId})
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if wallet == nil {
		return nil, 0, fmt.Errorf("invalid user")
	}
	filters := map[string]interface{}{
		"wallet_id": wallet.ID,
		"type":      transactionType,
	}
	transactions, total, err := s.walletRepo.GetWalletTransactions(filters, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	return transactions, total, nil
}

func (s *AdminService) GetWalletTransaction(id string) (*domain.WalletTransaction, error) {
	transaction, err := s.walletRepo.GetWalletTransactionByID(id)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if transaction == nil {
		return nil, nil
	}
	return transaction, nil
}

func (s *AdminService) GetWalletBalances(businessId string) (*domain.Wallet, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": businessId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong while fetching business")
	}
	if business == nil {
		return nil, fmt.Errorf("invalid business")
	}

	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"business_id": business.ID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			newWallet := &domain.Wallet{
				BusinessID: business.ID,
				UserID:     business.UserID,
			}
			_, err = s.walletRepo.Create(newWallet)
			if err != nil {
				return nil, fmt.Errorf("failed to create wallet: %v", err)
			}
			return newWallet, nil
		}
		return nil, fmt.Errorf("error fetching wallet: %v", err)
	}

	return wallet, nil
}

func (s *AdminService) ReviewKYC(id string, status string, reason string) (*domain.KYC, error) {
	kyc, err := s.kycRepo.Find(id)
	if err != nil {
		return nil, fmt.Errorf("kyc not found: %w", err)
	}

	if kyc.Status == "approved" {
		return nil, fmt.Errorf("KYC already approved")
	}

	now := time.Now()
	kyc.Status = status
	kyc.ReviewedAt = &now
	if status == "rejected" {
		kyc.Reason = reason
	} else {
		kyc.Reason = ""
	}

	if err := s.kycRepo.Update(kyc); err != nil {
		return nil, fmt.Errorf("failed to update kyc: %w", err)
	}

	// KYC1: denormalise the outcome onto the seller's Business (drives the
	// buyer-facing Verified badge + the withdrawal gate) and notify the seller.
	// Best-effort — a denorm/notification failure must not fail a valid review.
	if business, bErr := s.businessRepo.GetOne(map[string]interface{}{"user_id": kyc.UserID}); bErr == nil && business != nil {
		switch status {
		case "approved":
			_, _ = s.businessRepo.Update(business.ID, map[string]interface{}{"is_verified": true, "kyc_status": "verified"})
			// NS2 seller.kyc.verified (in-app).
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "seller.kyc.verified",
				UserID: kyc.UserID,
			})
		case "rejected":
			_, _ = s.businessRepo.Update(business.ID, map[string]interface{}{"kyc_status": "rejected"})
			// NS2 seller.kyc.needs_attention (in-app).
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "seller.kyc.needs_attention",
				UserID: kyc.UserID,
				Vars:   map[string]string{"reason": reason},
			})
		}
	}

	return kyc, nil
}

func (s *AdminService) GetAllKYC(page, limit int, search string) ([]*domain.KYC, int64, error) {
	offset := (page - 1) * limit
	return s.kycRepo.FindAllKYC(limit, offset, search)
}

// Admin Shipping Methods - Safe admin-only endpoints that don't affect main app

func (s *AdminService) GetAllShipments(page, limit int) ([]domain.Shipment, int64, error) {
	// Get all shipments for admin view - this doesn't affect main app functionality
	return s.shippingRepo.GetAllShipments(map[string]interface{}{}, false, page, limit)
}

func (s *AdminService) GetShipment(id string) (*domain.Shipment, error) {
	// Get single shipment for admin view - safe read-only operation
	return s.shippingRepo.GetOneShipment(map[string]interface{}{"id": id}, false)
}

// UpdateShippingStatus manually updates shipping status when webhooks fail
// This replicates the exact logic from webhook.go to ensure consistency
func (s *AdminService) UpdateShippingStatus(orderItemID, status, reason, notes string) (*domain.OrderItem, error) {
	logger.Info(fmt.Sprintf("Admin updating shipping status for order item %s to %s", orderItemID, status))

	// 1. Get order item
	item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{"id": orderItemID}, false)
	if err != nil {
		return nil, fmt.Errorf("order item not found: %w", err)
	}

	// 2. Get order for user notifications
	order, err := s.orderRepo.Find(item.OrderID, false)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	// 3. Process based on status (replicating webhook.go logic exactly)
	now := time.Now()
	adminNote := fmt.Sprintf(" (Admin override: %s)", reason)

	switch status {
	case "confirmed":
		// Add activities for both buyer and seller
		_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityShippingConfirmed),
			Subtitle: "Shipment Created & Assigned",
			Details:  "Your order is assigned to a delivery partner." + adminNote,
			Time:     now.String(),
		}, "buyer", false)
		if err != nil {
			logger.Error(fmt.Sprintf("Failed to append buyer activity: %v", err))
		}

		_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityShippingConfirmed),
			Subtitle: "Shipment Created & Assigned",
			Details:  "Your order is assigned to a delivery partner." + adminNote,
			Time:     now.String(),
		}, "seller", false)
		if err != nil {
			logger.Error(fmt.Sprintf("Failed to append seller activity: %v", err))
		}

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityRiderEnrouteToVendor),
			Subtitle: string(helper.OrderActivityRiderEnrouteToVendor),
			Details:  "Rider is en route to pick up your order." + adminNote,
			Time:     now.String(),
		}, "buyer", false)

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityRiderEnrouteToVendor),
			Subtitle: string(helper.OrderActivityRiderEnrouteToVendor),
			Details:  "Rider is en route to pick up your order." + adminNote,
			Time:     now.String(),
		}, "seller", false)

		item.Status = string(helper.OrderStatusProcessing)
		item.StatusUpdatedAt = now

	case "picked_up":
		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityOrderPickedup),
			Subtitle: "Order Picked Up & In Transit",
			Details:  "Your order is on the way to the delivery location." + adminNote,
			Time:     now.String(),
		}, "buyer", false)

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityOrderPickedup),
			Subtitle: "Order Picked Up & In Transit",
			Details:  "Your order is on the way to the delivery location." + adminNote,
			Time:     now.String(),
		}, "seller", false)

		// Send notification to buyer
		_ = s.notificationService.CreateNotification(&domain.Notification{
			UserID:    order.UserID,
			Title:     string(helper.OrderPickedUpTitle),
			Message:   fmt.Sprintf(string(helper.OrderPickedUpBody), item.ID),
			Type:      string(helper.OrderNotification),
			ActionURL: fmt.Sprintf("/orders/%s", item.ID),
			IsRead:    false,
		})

	case "in_transit":
		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityOrderInTransit),
			Subtitle: "Out for Delivery",
			Details:  "Your order is out for delivery." + adminNote,
			Time:     now.String(),
		}, "buyer", false)

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityOrderInTransit),
			Subtitle: "Out for Delivery",
			Details:  "Your order is out for delivery." + adminNote,
			Time:     now.String(),
		}, "seller", false)

		item.Status = string(helper.OrderStatusShipped)
		item.StatusUpdatedAt = now

		_ = s.notificationService.CreateNotification(&domain.Notification{
			UserID:    order.UserID,
			Title:     string(helper.OrderInTransitTitle),
			Message:   fmt.Sprintf(string(helper.OrderInTransitBody), item.ID),
			Type:      string(helper.OrderNotification),
			ActionURL: fmt.Sprintf("/orders/%s", item.ID),
			IsRead:    false,
		})

	case "completed":
		// R4 idempotency: guard on an ATOMIC claim, not vendor_credited (which is
		// only set later by the release cron, so it is always false here — the old
		// guard was cosmetic and a repeat "completed" double-credited).
		prevStatus, prevStatusAt := item.Status, item.StatusUpdatedAt
		claimed, cerr := s.orderRepo.ClaimOrderItemDelivered(item.ID, false)
		if cerr != nil {
			return nil, fmt.Errorf("something went wrong")
		}
		if claimed {
			// Admin shipping-status path is non-guest (item/order fetched authed).
			if err := s.walletService.MoveToClearingFromOrders(item, float64(item.Quantity)*item.Price, false); err != nil {
				// Roll the claim back so funds are never left delivered-without-credit.
				_, _ = s.orderRepo.UpdateOrderItemStatus(item.ID, prevStatus, prevStatusAt, false)
				logger.Error(fmt.Sprintf("Failed to credit seller wallet: %v", err))
				return nil, fmt.Errorf("failed to credit seller wallet: %w", err)
			}
		}

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityDelivered),
			Subtitle: string(helper.OrderActivityDelivered),
			Details:  "Your order has been successfully delivered." + adminNote,
			Time:     now.String(),
		}, "buyer", false)

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityDelivered),
			Subtitle: string(helper.OrderActivityDelivered),
			Details:  "Your order has been successfully delivered." + adminNote,
			Time:     now.String(),
		}, "seller", false)

		item.Status = string(helper.OrderStatusDelivered)
		item.StatusUpdatedAt = now

		_ = s.notificationService.CreateNotification(&domain.Notification{
			UserID:    order.UserID,
			Title:     string(helper.OrderDeliveredTitle),
			Message:   fmt.Sprintf(string(helper.OrderDeliveredBody), item.ID),
			Type:      string(helper.OrderNotification),
			ActionURL: fmt.Sprintf("/orders/%s", item.ID),
			IsRead:    false,
		})

	case "cancelled":
		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityCancelled),
			Subtitle: string(helper.OrderActivityCancelled),
			Details:  "Your order has been canceled." + adminNote,
			Time:     now.String(),
		}, "buyer", false)

		_, _ = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityCancelled),
			Subtitle: string(helper.OrderActivityCancelled),
			Details:  "Your order has been canceled." + adminNote,
			Time:     now.String(),
		}, "seller", false)

		item.Status = string(helper.OrderStatusCancelled)
		item.StatusUpdatedAt = now

		_ = s.notificationService.CreateNotification(&domain.Notification{
			UserID:    order.UserID,
			Title:     string(helper.OrderCancelledTitle),
			Message:   fmt.Sprintf(string(helper.OrderCancelledBody), item.ID),
			Type:      string(helper.OrderNotification),
			ActionURL: fmt.Sprintf("/orders/%s", item.ID),
			IsRead:    false,
		})

	default:
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	// 4. Update order item status only (NOT activity arrays which were already saved by AppendActivity)
	updatedItem, err := s.orderRepo.UpdateOrderItemStatus(item.ID, item.Status, item.StatusUpdatedAt, false)
	if err != nil {
		return nil, fmt.Errorf("failed to update order item: %w", err)
	}

	// 5. Update shipment provider_data status if shipment exists
	if item.ShipmentID != "" {
		s.updateShipmentProviderStatus(item.ShipmentID, status, reason)
	}

	logger.Info(fmt.Sprintf("Successfully updated shipping status for order item %s to %s", orderItemID, status))
	return updatedItem, nil
}

// updateShipmentProviderStatus updates the shipment's provider_data with the new status
func (s *AdminService) updateShipmentProviderStatus(shipmentID, status, reason string) {
	shipment, err := s.shippingRepo.GetOneShipment(map[string]interface{}{"id": shipmentID}, false)
	if err != nil || shipment == nil {
		logger.Error(fmt.Sprintf("Failed to get shipment %s for status update: %v", shipmentID, err))
		return
	}

	// Update provider_data with new status and admin override info
	if len(shipment.ProviderData) > 0 {
		shipment.ProviderData[0]["status"] = status
		shipment.ProviderData[0]["admin_override"] = true
		shipment.ProviderData[0]["admin_override_reason"] = reason
		shipment.ProviderData[0]["admin_override_at"] = time.Now().Format(time.RFC3339)
	}

	// Update shipment in database
	err = s.shippingRepo.UpdateShipmentProviderData(shipmentID, shipment.ProviderData)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to update shipment provider data: %v", err))
	}
}

// DeleteOrderItem completely removes an order item and reverses any wallet transactions
func (s *AdminService) DeleteOrderItem(orderItemId string) error {
	logger.Info(fmt.Sprintf("Admin deleting order item: %s", orderItemId))

	// 1. Get the order item to know the amount, status, and business
	item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{"id": orderItemId}, false)
	if err != nil {
		return fmt.Errorf("order item not found: %w", err)
	}

	// 2. Get wallet for this business to reverse any balance changes
	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"business_id": item.BusinessID})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("error fetching wallet: %w", err)
	}

	// 3. If wallet exists and vendor was credited, reverse the wallet BALANCES
	if wallet != nil && item.VendorCredited {
		amount := item.Price * float64(item.Quantity)

		// Reverse based on where the money currently sits
		// If delivered: money is in clearing_balance (or moved to available_balance via cron)
		// If payment_confirmed/shipped: money is in orders_in_progress
		if item.Status == string(helper.OrderStatusDelivered) {
			// Subtract from clearing_balance (or available if already cleared)
			if wallet.ClearingBalance >= amount {
				wallet.ClearingBalance -= amount
			} else if wallet.AvailableBalance >= amount {
				wallet.AvailableBalance -= amount
			}
			wallet.TotalEarnings -= amount
		} else if item.Status == string(helper.OrderStatusPaymentConfirmed) || item.Status == string(helper.OrderStatusShipped) {
			// Subtract from orders_in_progress
			if wallet.OrdersInProgress >= amount {
				wallet.OrdersInProgress -= amount
			}
		}

		// Update wallet balances
		if err := s.walletRepo.UpdateWalletBalances(wallet); err != nil {
			logger.Error(fmt.Sprintf("Failed to update wallet balances: %v", err))
			return fmt.Errorf("failed to reverse wallet balance: %w", err)
		}
	}

	// 3b. ALWAYS delete wallet transactions (regardless of VendorCredited status)
	if wallet != nil {
		if err := s.walletRepo.DeleteTransactionsByOrderItemID(orderItemId); err != nil {
			logger.Error(fmt.Sprintf("Failed to delete wallet transactions: %v", err))
			// Continue - main delete is more important
		}
	}

	// 3d. Delete notifications referencing this order item
	if err := s.notificationRepo.DeleteByOrderItemID(orderItemId); err != nil {
		logger.Error(fmt.Sprintf("Failed to delete notifications: %v", err))
	}

	// 3e. Delete shipment if exists
	if item.ShipmentID != "" {
		if err := s.db.Where("id = ?", item.ShipmentID).Delete(&domain.Shipment{}).Error; err != nil {
			logger.Error(fmt.Sprintf("Failed to delete shipment: %v", err))
		}
	}

	// 4. Store parent order ID before deleting
	parentOrderID := item.OrderID

	// 5. Delete the order item
	if err := s.db.Where("id = ?", orderItemId).Delete(&domain.OrderItem{}).Error; err != nil {
		return fmt.Errorf("failed to delete order item: %w", err)
	}

	// 6. Check if parent order has no more items, delete if empty
	var remainingItems int64
	s.db.Model(&domain.OrderItem{}).Where("order_id = ?", parentOrderID).Count(&remainingItems)
	if remainingItems == 0 {
		if err := s.db.Where("id = ?", parentOrderID).Delete(&domain.Order{}).Error; err != nil {
			logger.Error(fmt.Sprintf("Failed to delete empty parent order: %v", err))
			// Don't return error - order item was already deleted successfully
		} else {
			logger.Info(fmt.Sprintf("Deleted empty parent order: %s", parentOrderID))
		}
	}

	logger.Info(fmt.Sprintf("Successfully deleted order item: %s", orderItemId))
	return nil
}

// DeleteOrder completely removes an order and all its order items with full cleanup
func (s *AdminService) DeleteOrder(orderId string) error {
	logger.Info(fmt.Sprintf("Admin deleting order: %s", orderId))

	// Get all order items for this order
	items, err := s.orderRepo.GetAllOrderItems(map[string]interface{}{"order_id": orderId}, false)
	if err != nil {
		return fmt.Errorf("failed to get order items: %w", err)
	}

	// Delete each order item with full cleanup
	for _, item := range items {
		if err := s.DeleteOrderItem(item.ID); err != nil {
			logger.Error(fmt.Sprintf("Failed to delete order item %s: %v", item.ID, err))
			// Continue with other items
		}
	}

	// Delete the parent order (should already be deleted by DeleteOrderItem if empty, but ensure)
	if err := s.db.Where("id = ?", orderId).Delete(&domain.Order{}).Error; err != nil {
		logger.Error(fmt.Sprintf("Failed to delete parent order: %v", err))
	}

	logger.Info(fmt.Sprintf("Successfully deleted order: %s", orderId))
	return nil
}
