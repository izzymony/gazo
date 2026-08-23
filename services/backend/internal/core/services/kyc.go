package services

import (
	"context"
	"errors"
	"fmt"
	"io"

	"gorm.io/gorm"
	mysql_repo "vibaar/backend/internal/adapter/repositories/sql"
	"vibaar/backend/internal/core/domain"
	fileupload "vibaar/backend/internal/core/external_service/file-upload"
	"vibaar/backend/internal/ports"
)

type KYCService struct {
	kycRepo    ports.KYCRepoInterface
	userRepo   ports.UserRepoInterface
	dispatcher *NotificationDispatcher
}

func NewKYCService(db *gorm.DB) *KYCService {
	return &KYCService{
		kycRepo:    mysql_repo.NewKYCRepository(db),
		userRepo:   mysql_repo.NewUserRepository(db),
		dispatcher: NewNotificationDispatcher(db),
	}
}

func (s *KYCService) SubmitKYC(userId string, isGuest bool, doc io.Reader, selfie io.Reader, docType, legalName, bvn string) (*domain.KYC, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}
	docURL, err := fileupload.UploadFileWithFallback(doc)
	if err != nil {
		return nil, fmt.Errorf("failed to upload document: %w", err)
	}

	selfieURL, err := fileupload.UploadFileWithFallback(selfie)
	if err != nil {
		return nil, fmt.Errorf("failed to upload selfie: %w", err)
	}

	kyc, err := s.kycRepo.GetUserKYC(userId)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to fetch KYC status: %w", err)
	}

	if kyc != nil && kyc.Status == "pending" {
		return nil, fmt.Errorf("KYC already pending")
	}

	kyc = &domain.KYC{
		UserID:       userId,
		Document:     docURL,
		DocumentType: docType,
		Selfie:       selfieURL,
		LegalName:    legalName,
		BVN:          bvn, // TODO(security): encrypt-at-rest before launch (see KYC1 §13, deferred)
		Status:       "pending",
	}

	err = s.kycRepo.CreateKYC(kyc)
	if err != nil {
		return nil, fmt.Errorf("failed to save KYC data: %w", err)
	}

	// NS2 seller.kyc.submitted (in-app).
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.kyc.submitted",
		UserID: userId,
	})

	return kyc, nil
}

func (s *KYCService) GetKYCStatus(userId string, isGuest bool) (*domain.KYC, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}
	kyc, err := s.kycRepo.GetUserKYC(userId)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to fetch KYC status: %w", err)
	}
	return kyc, nil
}
