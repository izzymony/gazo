package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"

	"gorm.io/gorm"
	"vibaar/backend/internal/adapter/api/requests"
	mysql_repo "vibaar/backend/internal/adapter/repositories/sql"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"
	"vibaar/backend/internal/ports"
)

type WalletService struct {
	businessRepo            ports.BusinessIface
	userRepo                ports.UserRepoInterface
	walletRepo              ports.WalletInterface
	productRepo             ports.ProductRepoIface
	orderRepo               ports.OrderRepoInterface
	withdrawalRequestRepo   ports.WithdrawalRequestInterface
	verificationCodeRepo    ports.VerificationCodeInterface
	verificationCodeService *VerificationCodeService
	dispatcher              *NotificationDispatcher
}

func NewWalletService(db *gorm.DB) *WalletService {
	return &WalletService{
		businessRepo:            mysql_repo.NewBusinessRepository(db),
		userRepo:                mysql_repo.NewUserRepository(db),
		walletRepo:              mysql_repo.NewWalletRepository(db),
		productRepo:             mysql_repo.NewProductRepository(db),
		orderRepo:               mysql_repo.NewOrderRepository(db),
		withdrawalRequestRepo:   mysql_repo.NewWithdrawalRequestRepository(db),
		verificationCodeRepo:    mysql_repo.NewVerificationCodeRepository(db),
		verificationCodeService: NewVerificationCodeService(db),
		dispatcher:              NewNotificationDispatcher(db),
	}
}

func (s *WalletService) UpdateBalance(businessID, field string, amount float64) error {
	return s.walletRepo.UpdateBalanceField(businessID, field, amount)
}

func (s *WalletService) MoveFunds(businessID, from, to string, amount float64) error {
	if amount <= 0 {
		return errors.New("invalid amount")
	}
	return s.walletRepo.MoveFunds(businessID, from, to, amount)
}

func (s *WalletService) ReleaseFromClearingToAvailable(businessID string, amount float64) error {
	return s.MoveFunds(businessID, "clearing_balance", "available_balance", amount)
}

func (s *WalletService) MoveToClearingFromOrders(orderItem *domain.OrderItem, amount float64, isGuest bool) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": orderItem.BusinessID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong while fetching business")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}
	product, err := s.productRepo.Find(orderItem.ProductID)
	if err != nil {
		return fmt.Errorf("something went wrong while fetching product")
	}

	// Fetch order to get invoice (guest orders live in orders_guest)
	order, err := s.orderRepo.GetOneOrder(map[string]interface{}{"id": orderItem.OrderID}, isGuest)
	if err != nil {
		return fmt.Errorf("something went wrong while fetching order")
	}

	err = s.MoveFunds(orderItem.BusinessID, "orders_in_progress", "clearing_balance", amount)
	if err != nil {
		return err
	}
	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"business_id": orderItem.BusinessID})
	if err != nil {
		return err
	}

	tx := &domain.WalletTransaction{
		WalletID:        wallet.ID,
		Type:            string(helper.CreditClearingBalanceTransactionType),
		TypeDescription: fmt.Sprintf("%s order completed #%s", product.Title, order.Invoice),
		Amount:          amount,
		Reference:       helper.GenerateReference(),
		BalanceBefore:   wallet.ClearingBalance,
		BalanceAfter:    wallet.ClearingBalance + amount,
		Status:          "completed",
		Beneficiary:     orderItem.BusinessID,
		From:            string(helper.OrdersInProgressTransactionType),
		To:              string(helper.ClearingBalanceWalletBalanceType),
		Metadata: domain.MapArray{
			{"order_item_id": orderItem.ID},
		},
	}

	return s.walletRepo.CreateWalletTransaction(tx)
}

func (s *WalletService) CreditForOrderInProgress(orderItem *domain.OrderItem, amount float64, isGuest bool) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": orderItem.BusinessID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong while fetching business")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}
	product, err := s.productRepo.Find(orderItem.ProductID)
	if err != nil {
		return fmt.Errorf("something went wrong while fetching product")
	}

	// Fetch order to get invoice (guest orders live in orders_guest)
	order, err := s.orderRepo.GetOneOrder(map[string]interface{}{"id": orderItem.OrderID}, isGuest)
	if err != nil {
		return fmt.Errorf("something went wrong while fetching order")
	}

	err = s.walletRepo.UpdateBalanceField(orderItem.BusinessID, "orders_in_progress", amount)
	if err != nil {
		return err
	}

	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"business_id": orderItem.BusinessID})
	if err != nil {
		return err
	}
	tx := &domain.WalletTransaction{
		WalletID:        wallet.ID,
		Type:            string(helper.OrderInProgressTransactionType),
		TypeDescription: fmt.Sprintf("%s order in progress #%s", product.Title, order.Invoice),
		Amount:          amount,
		Reference:       helper.GenerateReference(),
		BalanceBefore:   wallet.OrdersInProgress,
		BalanceAfter:    wallet.OrdersInProgress + amount,
		Status:          "completed",
		Beneficiary:     business.Name,
		From:            "Vibaar",
		To:              string(helper.OrdersInProgressTransactionType),
		Metadata: domain.MapArray{
			{"order_item_id": orderItem.ID},
		},
	}

	return s.walletRepo.CreateWalletTransaction(tx)
}

func (s *WalletService) GetWalletBalances(userId string) (*domain.Wallet, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
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

func (s *WalletService) GetWalletTransactions(userId string, transactionType string, page, limit int) ([]domain.WalletTransaction, int64, error) {
	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"user_id": userId})
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

func (s *WalletService) GetWalletTransaction(id string, userId string) (*domain.WalletTransaction, error) {
	transaction, err := s.walletRepo.GetWalletTransactionByID(id)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if transaction == nil {
		return nil, nil
	}
	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}
	if wallet == nil {
		return nil, fmt.Errorf("invalid user")
	}
	if transaction.WalletID != wallet.ID {
		return nil, fmt.Errorf("insufficient access")
	}
	return transaction, nil
}

// kycWithdrawalGateNGN is the cumulative settled-sales threshold (₦) beyond which
// a seller must have an approved KYC to withdraw. Config: KYC_WITHDRAWAL_GATE_NGN
// (defaults to ₦100,000).
func kycWithdrawalGateNGN() float64 {
	if v := os.Getenv("KYC_WITHDRAWAL_GATE_NGN"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil && f > 0 {
			return f
		}
	}
	return 100000
}

func (s *WalletService) RequestWithdrawal(userId string, req requests.WithdrawalRequest) (*domain.WithdrawalRequest, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, fmt.Errorf("invalid business")
	}

	// KYC1 withdrawal gate: once cumulative settled sales cross the threshold,
	// withdrawals require an approved KYC (IsVerified). Selling and earning are
	// never blocked — only cash-out. Server-authoritative; web pre-checks only to
	// surface the verify CTA early.
	if business.LifetimeSales >= kycWithdrawalGateNGN() && !business.IsVerified {
		return nil, fmt.Errorf("verify your identity to withdraw — you've earned over ₦%.0f. Verification takes about 2 minutes", kycWithdrawalGateNGN())
	}

	var verificationCode *domain.VerificationCode
	if req.Otp == "000000" {
		if os.Getenv("ENV") != "dev" && os.Getenv("ENV") != "staging" {
			return nil, fmt.Errorf("invalid verification code")
		}
	} else {
		verificationCode, err = s.verificationCodeRepo.GetOne(map[string]interface{}{"identifier": userId, "type": string(helper.WithdrawalOTP)})
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong")
		}
		if verificationCode == nil || verificationCode.UUID != req.Otp {
			return nil, fmt.Errorf("invalid verification code")
		}
		if *verificationCode.Used {
			return nil, fmt.Errorf("verification code is already used")
		}
		createdAt := verificationCode.CreatedAt
		currentTime := time.Now()

		duration := currentTime.Sub(createdAt)

		if duration.Minutes() >= 10 {
			// mark used
			err = s.verificationCodeRepo.MarkAsUsed(verificationCode.ID)
			if err != nil {
				return nil, fmt.Errorf("something went wrong")
			}
			// mark code used on twilio
			// go func() {
			// 	if err = s.verificationCodeService.MarkOTPUsed(business.Phone, req.Otp); err != nil {
			// 		logger.Error(fmt.Sprintf("failed to mark OTP used; %v", err))
			// 		fmt.Sprintf("failed to mark OTP used; %v", err)
			// 	}
			// }()
			return nil, fmt.Errorf("otp expired, please request a new one")
		}

	}

	wallet, err := s.walletRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}
	if wallet == nil {
		return nil, fmt.Errorf("invalid user")
	}

	// Check effective balance (available minus pending withdrawals)
	effectiveBalance := wallet.AvailableBalance - wallet.PendingWithdrawals
	if effectiveBalance < req.Amount {
		return nil, fmt.Errorf("insufficient balance: ₦%.2f available (₦%.2f pending)", effectiveBalance, wallet.PendingWithdrawals)
	}

	bankAccountDetails, err := s.businessRepo.FindAccountDetailsByIDAndBusiness(req.BusinessBankAccountDetailsID, business.ID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if bankAccountDetails == nil {
		return nil, fmt.Errorf("bank account not found")
	}

	// Lock the balance atomically (prevents race conditions)
	if err := s.walletRepo.LockBalance(business.ID, req.Amount); err != nil {
		return nil, fmt.Errorf("failed to reserve funds: %v", err)
	}

	newRequest := &domain.WithdrawalRequest{
		UserID:               userId,
		WalletID:             wallet.ID,
		Amount:               req.Amount,
		Status:               "pending",
		BankAccountDetailsID: req.BusinessBankAccountDetailsID,
		Reference:            helper.GenerateReference(),
	}

	// Mark OTP as used synchronously (only if we have a valid verification code)
	if verificationCode != nil {
		err = s.verificationCodeRepo.MarkAsUsed(verificationCode.ID)
		if err != nil {
			logger.Error(fmt.Sprintf("failed to mark OTP used; %v", err))
		}
	}

	// Create the withdrawal request
	if err := s.withdrawalRequestRepo.Create(newRequest); err != nil {
		// Rollback: unlock the balance if request creation fails
		unlockErr := s.walletRepo.UnlockBalance(business.ID, req.Amount)
		if unlockErr != nil {
			logger.Error(fmt.Sprintf("failed to unlock balance after failed withdrawal request: %v", unlockErr))
		}
		return nil, fmt.Errorf("failed to create withdrawal request: %v", err)
	}

	// NS2 seller.payout.withdrawal_processing — post-create, best-effort, no money op.
	bankLabel := bankAccountDetails.Bank
	if len(bankAccountDetails.AccountNumber) >= 4 {
		bankLabel = bankAccountDetails.Bank + " ••" + bankAccountDetails.AccountNumber[len(bankAccountDetails.AccountNumber)-4:]
	}
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.payout.withdrawal_processing",
		UserID: userId,
		Vars:   map[string]string{"amount": FormatNaira(req.Amount), "bank": bankLabel},
	})

	return newRequest, nil
}
