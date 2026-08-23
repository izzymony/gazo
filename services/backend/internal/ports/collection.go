package ports

import (
	"insta-api/internal/core/domain"
)

type CollectionInterface interface {
	Create(*domain.Collection) (*domain.Collection, error)
	GetByID(id string) (*domain.Collection, error)
	Update(id string, updateData *domain.Collection) error
	Delete(id string) error
	GetAll(businessId, search string, page, limit int) ([]domain.Collection, int64, error)
	GetOne(param map[string]interface{}) (*domain.Collection, error)
}
