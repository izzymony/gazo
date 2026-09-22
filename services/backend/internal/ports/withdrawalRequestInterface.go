package ports

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type WithdrawalRequestInterface interface {
	Create(req *domain.WithdrawalRequest) error
	FindByID(id string) (*domain.WithdrawalRequest, error)
	UpdateStatus(id, status, reason string) error
	// statuses filters to those withdrawal states; empty means no filter.
	// `offset`, not `page` — the caller does the arithmetic.
	GetAll(limit, offset int, statuses []string) ([]domain.WithdrawalRequest, int64, error)
	// CountsByStatus spans the whole table, independent of pagination and of
	// any active filter.
	CountsByStatus() ([]domain.WithdrawalStatusTally, error)
}
