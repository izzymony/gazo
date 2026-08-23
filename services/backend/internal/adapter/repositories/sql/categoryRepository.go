package mysql_repo

import (
	"fmt"
	"strings"

	"insta-api/internal/core/domain"
	"insta-api/internal/helper"
	"insta-api/internal/ports"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) ports.CategoryRepoIface {
	return &CategoryRepository{
		db: db,
	}
}

func (repo *CategoryRepository) GetAllCategories(param map[string]interface{}) ([]domain.Category, error) {
	var categories []domain.Category

	q := repo.db.Model(&domain.Category{}).Preload("SubCategories")

	for field, value := range param {
		if helper.NotEmpty(value) {
			q = q.Where(fmt.Sprintf("%s = ?", field), value)
		}
	}

	err := q.Find(&categories).Error
	return categories, err
}

func (repo *CategoryRepository) FindCategory(param map[string]interface{}) (*domain.Category, error) {
	var category domain.Category
	q := repo.db.Model(&domain.Category{}).Preload("SubCategories")
	for field, value := range param {
		if helper.NotEmpty(value) {
			q = q.Where(fmt.Sprintf("%s = ?", field), value)
		}
	}
	err := q.First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (repo *CategoryRepository) FindSubCategory(param map[string]interface{}) (*domain.SubCategory, error) {
	var category domain.SubCategory
	q := repo.db.Model(&domain.SubCategory{})
	for field, value := range param {
		if helper.NotEmpty(value) {
			q = q.Where(fmt.Sprintf("%s = ?", field), value)
		}
	}
	err := q.First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (repo *CategoryRepository) SearchField() []string {
	return []string{"name", "active"}
}

func (repo *CategoryRepository) FindCategoryById(id string) (*domain.Category, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("id = ?", id).First(&model)

	return &model, q.Error
}

func (repo *CategoryRepository) CreateCategory(data *domain.Category) (domain.Category, error) {
	model := repo.Model()
	q := repo.db.Model(model).Create(data)
	return *data, q.Error

}

func (repo *CategoryRepository) UpdateCategory(id string, data interface{}) (*domain.Category, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Updates(data)
	if q.Error != nil {
		return nil, q.Error
	}

	res, err := repo.FindCategoryById(id)
	return res, err
}

func (repo *CategoryRepository) DeleteCategory(id string) (domain.Category, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *CategoryRepository) CreateSubcategory(data *domain.SubCategory) (*domain.SubCategory, error) {
	if err := repo.db.Create(data).Error; err != nil {
		return nil, err
	}
	return data, nil
}

func (repo *CategoryRepository) FindSubcategoryById(id string) (*domain.SubCategory, error) {
	var subCategory domain.SubCategory
	err := repo.db.First(&subCategory, "id = ?", id).Error
	return &subCategory, err
}

func (repo *CategoryRepository) UpdateSubcategory(id string, data *domain.SubCategory) (*domain.SubCategory, error) {
	q := repo.db.Model(&domain.SubCategory{}).Where("id = ?", id).Updates(data)
	if q.Error != nil {
		return nil, q.Error
	}
	return data, nil
}

func (repo *CategoryRepository) SearchCategoriesAndSubCategories(search string) (domain.CategorySearchResult, error) {
	var categories []domain.Category
	var subCategories []domain.SubCategory

	searchTerm := "%" + strings.ToLower(search) + "%"

	categoryQuery := repo.db.Model(&domain.Category{}).
		Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm).
		Find(&categories)

	if categoryQuery.Error != nil {
		return domain.CategorySearchResult{}, categoryQuery.Error
	}

	subCategoryQuery := repo.db.Model(&domain.SubCategory{}).
		Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm).
		Find(&subCategories)

	if subCategoryQuery.Error != nil {
		return domain.CategorySearchResult{}, subCategoryQuery.Error
	}

	return domain.CategorySearchResult{
		Categories:    categories,
		SubCategories: subCategories,
	}, nil
}

func (repo *CategoryRepository) Model() domain.Category {
	return domain.Category{}
}
