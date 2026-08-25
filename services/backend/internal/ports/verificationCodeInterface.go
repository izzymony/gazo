package ports

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type VerificationCodeInterface interface {
	Create(data *domain.VerificationCode) (domain.VerificationCode, error)
	Find(id string) (domain.VerificationCode, error)
	GetOne(param map[string]interface{}) (*domain.VerificationCode, error)
	Update(id string, data domain.VerificationCode) (*domain.VerificationCode, error)
	MarkAllVerificationCodeAsUsed(userId, verificationType string) error
	VerifyCode(userId, codeType, uuid string) error
	MarkAsUsed(id string) error
}
