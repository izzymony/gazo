package ports

import "vibaar/backend/internal/core/domain"

type CategoryRepoIface interface {
	CreateCategory(data *domain.Category) (domain.Category, error)
	FindCategoryById(id string) (*domain.Category, error)
	GetAllCategories(param map[string]interface{}) ([]domain.Category, error)
	FindCategory(param map[string]interface{}) (*domain.Category, error)
	UpdateCategory(id string, data interface{}) (*domain.Category, error)
	DeleteCategory(id string) (domain.Category, error)
	CreateSubcategory(data *domain.SubCategory) (*domain.SubCategory, error)
	FindSubcategoryById(id string) (*domain.SubCategory, error)
	UpdateSubcategory(id string, data *domain.SubCategory) (*domain.SubCategory, error)
	FindSubCategory(param map[string]interface{}) (*domain.SubCategory, error)
	SearchCategoriesAndSubCategories(search string) (domain.CategorySearchResult, error)
}
