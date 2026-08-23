package ports

import (
	"vibaar/backend/internal/core/domain"
)

type ProductRepoIface interface {
	Create(data *domain.Product) (domain.Product, error)
	Find(id string) (domain.Product, error)
	GetAll(param map[string]interface{}) ([]domain.Product, error)
	Update(id string, data domain.Product) (*domain.Product, error)
	Delete(id string) (domain.Product, error)
	GetOne(param map[string]interface{}) (*domain.Product, error)
	GetOneWithAssociations(param map[string]interface{}) (*domain.Product, error)
	AddProductWishlist(input *domain.ProductWishlist, isGuest bool) (*domain.ProductWishlist, error)
	FindProductWishlistByFields(filters map[string]interface{}, isGuest bool) (*domain.ProductWishlist, error)
	GetAllProductWishlist(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.ProductWishlist, int64, error)
	DeleteProductWishlist(id string, isGuest bool) error
	GetAllPaginated(params map[string]interface{}, search string, page, limit int) ([]domain.Product, int64, error)
	AddRecentlyViewedProducts(input []*domain.RecentlyViewedProduct, isGuest bool) error
	IncrementProductSales(productID string, incrementBy int) error
	DecrementProductStock(productID string, decrementBy int) error
	GetAllPaginatedWithContext(
		userID string,
		isGuest bool,
		params map[string]interface{},
		search, contextKey string,
		page, limit int,
	) ([]domain.Product, int64, error)
	GetTopVendors(page, limit int) ([]domain.Business, int64, error)
	DeleteVariantsByProductID(productID string) error
}
