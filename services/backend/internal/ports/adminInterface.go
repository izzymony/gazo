package ports

import "vibaar/backend/internal/core/domain"

type AdminInterface interface {
	GetOne(param map[string]interface{}) (*domain.Admin, error)
}
