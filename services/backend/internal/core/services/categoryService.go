package services

import (
	"errors"
	"fmt"

	"insta-api/internal/adapter/api/requests"
	mysql_repo "insta-api/internal/adapter/repositories/sql"
	"insta-api/internal/core/domain"
	"insta-api/internal/ports"

	"gorm.io/gorm"
)

type CategoryService struct {
	repo ports.CategoryRepoIface
}

func NewCategoryService(db *gorm.DB) *CategoryService {
	return &CategoryService{
		repo: mysql_repo.NewCategoryRepository(db),
	}
}

func (s *CategoryService) CreateCategory(input requests.Category) (*domain.Category, error) {
	existing, err := s.repo.FindCategory(map[string]interface{}{"name": input.Name})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error: %v", err)
	}
	if existing != nil {
		return nil, errors.New("category with name already exists")
	}
	newCategory := domain.Category{
		Name:               input.Name,
		Slug:               input.Slug,
		Description:        input.Description,
		Status:             input.Status,
		MinWeight:          input.MinWeight,
		MaxWeight:          input.MaxWeight,
		ExternalCategoryId: input.ExternalCategoryId,
	}

	createdCategory, err := s.repo.CreateCategory(&newCategory)
	if err != nil {
		return nil, fmt.Errorf("failed to create category: %v", err)
	}

	return &createdCategory, nil
}

func (s *CategoryService) GetAllCategories() ([]domain.Category, error) {
	return s.repo.GetAllCategories(nil)
}

func (s *CategoryService) GetCategoryById(id string) (*domain.Category, error) {
	return s.repo.FindCategoryById(id)
}

func (s *CategoryService) UpdateCategory(categoryId string, input requests.Category) (*domain.Category, error) {
	_, err := s.repo.FindCategoryById(categoryId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("category not found")
		}
		return nil, fmt.Errorf("failed to fetch category: %v", err)
	}

	existing, err := s.repo.FindCategory(map[string]interface{}{"name": input.Name})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error: %v", err)
	}
	if existing != nil && existing.ID != categoryId {
		return nil, fmt.Errorf("another category with this name already exists")
	}

	updateData := domain.Category{
		Name:               input.Name,
		Slug:               input.Slug,
		Description:        input.Description,
		Status:             input.Status,
		ExternalCategoryId: input.ExternalCategoryId,
		MinWeight:          input.MinWeight,
		MaxWeight:          input.MaxWeight,
	}

	updatedCategory, err := s.repo.UpdateCategory(categoryId, updateData)
	if err != nil {
		return nil, fmt.Errorf("failed to update category: %v", err)
	}

	return updatedCategory, nil
}

func (s *CategoryService) CreateSubCategory(input requests.SubCategory) (*domain.SubCategory, error) {
	existing, err := s.repo.FindSubCategory(map[string]interface{}{"name": input.Name})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error: %v", err)
	}
	if existing != nil && existing.CategoryId == input.CategoryId {
		return nil, errors.New("sub category with name already exists for this category")
	}
	subCategory := domain.SubCategory{
		Name:          input.Name,
		Description:   input.Description,
		Slug:          input.Slug,
		Icon:          input.Icon,
		Status:        input.Status,
		CategoryId:    input.CategoryId,
		DefaultHeight: input.DefaultHeight,
		DefaultWidth:  input.DefaultWidth,
		DefaultLength: input.DefaultLength,
		DefaultWeight: input.DefaultWeight,
	}

	created, err := s.repo.CreateSubcategory(&subCategory)
	if err != nil {
		return nil, fmt.Errorf("failed to create sub-category: %v", err)
	}

	return created, nil
}

func (s *CategoryService) UpdateSubCategory(id string, input requests.SubCategory) (*domain.SubCategory, error) {
	existing, err := s.repo.FindSubcategoryById(id)
	if err != nil {
		return nil, fmt.Errorf("sub-category not found: %v", err)
	}
	checkExisting, err := s.repo.FindSubCategory(map[string]interface{}{"name": input.Name})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error: %v", err)
	}
	if checkExisting != nil && checkExisting.CategoryId != existing.CategoryId {
		return nil, fmt.Errorf("another sub category with this name already exists for this category")
	}
	existing.Name = input.Name
	existing.Description = input.Description
	existing.Slug = input.Slug
	existing.Icon = input.Icon
	existing.Status = input.Status
	existing.CategoryId = id
	existing.DefaultHeight = input.DefaultHeight
	existing.DefaultWidth = input.DefaultWidth
	existing.DefaultLength = input.DefaultLength
	existing.DefaultWeight = input.DefaultWeight

	updated, err := s.repo.UpdateSubcategory(id, existing)
	if err != nil {
		return nil, fmt.Errorf("failed to update sub-category: %v", err)
	}

	return updated, nil
}

func (s *CategoryService) SearchCategoriesAndSubCategories(search string) (map[string]interface{}, error) {
	results, err := s.repo.SearchCategoriesAndSubCategories(search)
	if err != nil {
		return nil, fmt.Errorf("search failed: %v", err)
	}

	return map[string]interface{}{
		"categories":     results.Categories,
		"sub_categories": results.SubCategories,
	}, nil
}
