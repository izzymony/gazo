package ports

import "insta-api/internal/core/domain"

type AdminInterface interface {
	GetOne(param map[string]interface{}) (*domain.Admin, error)
}
