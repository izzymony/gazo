package ports

import (
	"insta-api/internal/core/domain"
)

type WithdrawalRequestInterface interface {
	Create(req *domain.WithdrawalRequest) error
	FindByID(id string) (*domain.WithdrawalRequest, error)
	UpdateStatus(id, status, reason string) error
	GetAll(limit, page int) ([]domain.WithdrawalRequest, int64, error)
}
