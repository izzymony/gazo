package ports

import "github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"

type ProductRatingRatingRepoIface interface {
	Create(data *domain.ProductRating) (domain.ProductRating, error)
	Find(id string) (domain.ProductRating, error)
	GetAll(param map[string]interface{}) ([]domain.ProductRating, error)
	Update(id string, data interface{}) (*domain.ProductRating, error)
	Delete(id string) (domain.ProductRating, error)
	GetOne(param map[string]interface{}) (*domain.ProductRating, error)
}
