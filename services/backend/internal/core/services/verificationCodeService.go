package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/smtp"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type VerificationCodeService struct {
	verificationCodeRepo ports.VerificationCodeInterface
	businessRepo         ports.BusinessIface
	userRepo             ports.UserRepoInterface
	walletRepo           ports.WalletInterface
	productRepo          ports.ProductRepoIface
	sendchampService     *smtp.SendChampService
	twilioService        *smtp.TwilioService
}

func NewVerificationCodeService(db *gorm.DB) *VerificationCodeService {
	return &VerificationCodeService{
		verificationCodeRepo: mysql_repo.NewVerificationCodeRepository(db),
		businessRepo:         mysql_repo.NewBusinessRepository(db),
		userRepo:             mysql_repo.NewUserRepository(db),
		walletRepo:           mysql_repo.NewWalletRepository(db),
		productRepo:          mysql_repo.NewProductRepository(db),
		sendchampService:     smtp.NewSendChampService(),
		twilioService:        smtp.NewTwilioService(db),
	}
}

func (s *VerificationCodeService) SendWithdrawalRequestOTP(userId string) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong while fetching business")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}
	err = s.verificationCodeRepo.MarkAllVerificationCodeAsUsed(userId, string(helper.WithdrawalOTP))
	if err != nil {
		return fmt.Errorf("failed to mark previous OTPs as used: %w", err)
	}

	var (
		otp  string
		code *domain.VerificationCode
	)

	for attempt := 0; attempt < 10; attempt++ {
		otp, err = helper.GenerateRandomNumber(100000, 999999)
		if err != nil {
			return fmt.Errorf("failed to generate OTP: %w", err)
		}

		existing, err := s.verificationCodeRepo.GetOne(map[string]interface{}{"uuid": otp, "used": false, "identifier": userId})
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("error checking existing OTP: %w", err)
		}
		if existing != nil && existing.ID != "" {
			continue
		}

		code = &domain.VerificationCode{
			UUID:       otp,
			Used:       helper.ToPtr(false),
			Type:       string(helper.WithdrawalOTP),
			Identifier: userId,
		}

		_, err = s.verificationCodeRepo.Create(code)
		if err != nil {
			return fmt.Errorf("failed to create verification code: %w", err)
		}
		break
	}
	// Send the real WhatsApp OTP only in production; non-production skips it.
	if helper.IsProduction() {
		err = s.twilioService.SendOTP(helper.NormalizePhoneNumber(business.Phone), otp, "whatsapp", "")
		if err != nil {
			return fmt.Errorf("failed to send OTP: %w", err)
		}
	}

	return nil
}

func (s *VerificationCodeService) SendRegisterOTP(identifier string) error {
	isPhoneNumber, normalizedPhoneNumber, err := helper.IsPhoneOrEmail(identifier)
	if err != nil {
		return err
	}
	if isPhoneNumber {
		identifier = normalizedPhoneNumber
	}

	err = s.verificationCodeRepo.MarkAllVerificationCodeAsUsed(identifier, string(helper.RegisterOTP))
	if err != nil {
		return fmt.Errorf("failed to mark previous OTPs as used: %w", err)
	}

	var (
		otp  string
		code *domain.VerificationCode
	)

	// Use a consistent dummy OTP outside production; production generates a real
	// random one below. helper.OTPBypassAllowed() is false in production.
	if helper.OTPBypassAllowed() {
		otp = "123456"
		
		// Generate a unique UUID for the verification code to avoid constraint violations
		// Use a combination of identifier and timestamp to ensure uniqueness
		uniqueUUID := fmt.Sprintf("%s_%d", otp, time.Now().UnixNano())
		
		code = &domain.VerificationCode{
			UUID:       uniqueUUID,
			Used:       helper.ToPtr(false),
			Type:       string(helper.RegisterOTP),
			Identifier: identifier,
		}

		_, err = s.verificationCodeRepo.Create(code)
		if err != nil {
			return fmt.Errorf("failed to create verification code: %w", err)
		}
	} else {
		for attempt := 0; attempt < 10; attempt++ {
			otp, err = helper.GenerateRandomNumber(100000, 999999)
			if err != nil {
				return fmt.Errorf("failed to generate OTP: %w", err)
			}

			existing, err := s.verificationCodeRepo.GetOne(map[string]interface{}{"uuid": otp, "used": false, "identifier": identifier})
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("error checking existing OTP: %w", err)
			}
			if existing != nil && existing.ID != "" {
				continue
			}

			code = &domain.VerificationCode{
				UUID:       otp,
				Used:       helper.ToPtr(false),
				Type:       string(helper.RegisterOTP),
				Identifier: identifier,
			}

			_, err = s.verificationCodeRepo.Create(code)
			if err != nil {
				return fmt.Errorf("failed to create verification code: %w", err)
			}
			break
		}
	}

	if !isPhoneNumber {
		disposable, err := helper.VerifyEmail(identifier)
		if err != nil || disposable {
			if err != nil {
				logger.Error(fmt.Sprintf("failed to verify email: %v", err))
				return fmt.Errorf("something went wrong")
			} else {
				if helper.IsProduction() {
					return fmt.Errorf("invalid email address. please use a non-disposable email")
				}
			}
		}
	}

	// Skip sending real SMS/email in dev, staging, or local environments
	if helper.IsProduction() {

		if isPhoneNumber {
			err = s.twilioService.SendOTP(helper.NormalizePhoneNumber(identifier), otp, "whatsapp", "")
			if err != nil {
				return fmt.Errorf("failed to send OTP to phone: %w", err)
			}
		}

		if !isPhoneNumber {
			err = s.twilioService.SendOTP(identifier, otp, "email", helper.SendgridRegisterOTPTemplate)
			if err != nil {
				return fmt.Errorf("failed to send OTP to email: %w", err)
			}
		}
	}

	return nil
}

func (s *VerificationCodeService) ValidateCode(identifier, otp, verificationType string) error {
	// Skip validation only outside production; production always validates.
	// helper.OTPBypassAllowed() is false in production.
	if !helper.OTPBypassAllowed() {
		isPhoneNumber, normalizedPhoneNumber, err := helper.IsPhoneOrEmail(identifier)
		if err != nil {
			return err
		}
		if isPhoneNumber {
			identifier = normalizedPhoneNumber
		}
		verificationCode, err := s.verificationCodeRepo.GetOne(map[string]interface{}{"identifier": identifier, "type": verificationType})
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("something went wrong")
		}
		if verificationCode == nil || verificationCode.UUID != otp {
			return fmt.Errorf("invalid verification code")
		}
		if *verificationCode.Used {
			return fmt.Errorf("verification code is already used")
		}
		createdAt := verificationCode.CreatedAt
		currentTime := time.Now()

		duration := currentTime.Sub(createdAt)

		if duration.Minutes() >= 10 {
			return fmt.Errorf("otp expired, please request a new one")
		}
		return nil
	} else {
		// In local/dev/staging, always allow validation with any OTP for easy testing
		// Just log the attempt and allow it
		fmt.Printf("[LOCAL] OTP validation bypassed - identifier: %s, otp: %s, type: %s\n", identifier, otp, verificationType)
		return nil
	}
}
