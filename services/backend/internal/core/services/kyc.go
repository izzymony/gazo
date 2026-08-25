package services

import (
	"context"
	"errors"
	"fmt"
	"io"

	"gorm.io/gorm"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	fileupload "github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/file-upload"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
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
	// R5: private (authenticated) storage for KYC docs when KYC_PRIVATE_STORAGE=true.
	docURL, err := fileupload.UploadKYCFile(doc)
	if err != nil {
		return nil, fmt.Errorf("failed to upload document: %w", err)
	}

	selfieURL, err := fileupload.UploadKYCFile(selfie)
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

	// R8: encrypt the BVN at rest — never store the raw number.
	encBVN, err := helper.EncryptBVN(bvn)
	if err != nil {
		return nil, fmt.Errorf("failed to secure BVN: %w", err)
	}

	kyc = &domain.KYC{
		UserID:       userId,
		Document:     docURL,
		DocumentType: docType,
		Selfie:       selfieURL,
		LegalName:    legalName,
		BVN:          encBVN,
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

	// R5: return viewable (signed) URLs; the stored refs stay private.
	kyc.Document, _ = fileupload.SignedKYCURL(kyc.Document)
	kyc.Selfie, _ = fileupload.SignedKYCURL(kyc.Selfie)
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
	// R8: decrypt the BVN + R5: sign the private KYC file URLs for the caller.
	if kyc != nil {
		kyc.BVN, _ = helper.DecryptBVN(kyc.BVN)
		kyc.Document, _ = fileupload.SignedKYCURL(kyc.Document)
		kyc.Selfie, _ = fileupload.SignedKYCURL(kyc.Selfie)
	}
	return kyc, nil
}
