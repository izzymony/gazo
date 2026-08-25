package ports

import "github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"

type AdminInterface interface {
	GetOne(param map[string]interface{}) (*domain.Admin, error)
}
