package ports

import (
	"insta-api/internal/core/domain"
)

type DiscountInterface interface {
	Create(data *domain.Discount) (domain.Discount, error)
	Find(id string) (domain.Discount, error)
	GetAll(param map[string]interface{}) ([]domain.Discount, error)
	GetAllPaginated(search string, page, limit int) ([]domain.Discount, int64, error)
	Update(id string, data domain.Discount) (*domain.Discount, error)
	Delete(id string) (domain.Discount, error)
	GetOne(param map[string]interface{}) (*domain.Discount, error)
	GetDiscounts(params map[string]interface{}, search string, page, limit int) ([]domain.Discount, int64, error)
}
