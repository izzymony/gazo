package ports

import "github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"

type TransactionRepoInterface interface {
	Create(data *domain.Transaction, isGuest bool) (*domain.Transaction, error)
	Find(id string) (domain.Transaction, error)
	GetAll(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.Transaction, int64, error)
	Update(id string, data domain.Transaction, isGuest bool) (*domain.Transaction, error)
	Delete(id string) (domain.Transaction, error)
	GetOne(param map[string]interface{}, isGuest bool) (*domain.Transaction, error)
	ClaimPending(id string, isGuest bool) (bool, error)
	SetStatus(id, status string, isGuest bool) error
	ExpireIfPending(id string, isGuest bool) error
}
