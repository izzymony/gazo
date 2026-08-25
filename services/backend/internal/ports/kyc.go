package ports

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type KYCRepoInterface interface {
	CreateKYC(kyc *domain.KYC) error
	GetUserKYC(userID string) (*domain.KYC, error)
	UpdateKYCStatus(id, status, reason string) error
	Find(id string) (*domain.KYC, error)
	Update(kyc *domain.KYC) error
	FindAllKYC(limit, offset int, search string) ([]*domain.KYC, int64, error)
}
