package services

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"insta-api/internal/adapter/api/requests"
	mysql_repo "insta-api/internal/adapter/repositories/sql"
	"insta-api/internal/core/domain"
	"insta-api/internal/helper"
	"insta-api/internal/ports"
)

type CollectionService struct {
	collectionRepo ports.CollectionInterface
	businessRepo   ports.BusinessIface
}

func NewCollectionService(db *gorm.DB) *CollectionService {
	return &CollectionService{
		collectionRepo: mysql_repo.NewCollectionRepository(db),
		businessRepo:   mysql_repo.NewBusinessRepository(db),
	}
}

func (s *CollectionService) Create(data *requests.Collection, userId string) (*domain.Collection, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, fmt.Errorf("invalid business")
	}
	existing, err := s.collectionRepo.GetOne(map[string]interface{}{"business_id": business.ID, "name": data.Name})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing collection")
	}
	if existing != nil {
		return nil, fmt.Errorf("a collection with the same name already exists")
	}

	return s.collectionRepo.Create(&domain.Collection{
		Name:        data.Name,
		Description: data.Description,
		BusinessID:  business.ID,
		Slug:        helper.GenerateSlug(data.Name),
	})
}

func (s *CollectionService) GetByID(id string) (*domain.Collection, error) {
	return s.collectionRepo.GetByID(id)
}

func (s *CollectionService) Update(id string, data *requests.Collection, userId string) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}
	existing, err := s.collectionRepo.GetByID(id)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to check existing collection: %v", err)
	}
	if existing == nil || existing.BusinessID != business.ID {
		return fmt.Errorf("invalid collection")
	}

	if data.Name != existing.Name {
		existing, err := s.collectionRepo.GetOne(map[string]interface{}{"business_id": business.ID, "name": data.Name})
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("failed to check existing collection: %v", err)
		}
		if existing != nil {
			return fmt.Errorf("a collection with the same name already exists")
		}
	}

	return s.collectionRepo.Update(id, &domain.Collection{
		Name:        data.Name,
		Description: data.Description,
		BusinessID:  business.ID,
		Slug:        helper.GenerateSlug(data.Name),
	})
}

func (s *CollectionService) Delete(id, userId string) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}
	existing, err := s.collectionRepo.GetByID(id)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to check existing collection: %v", err)
	}
	if existing == nil || existing.BusinessID != business.ID {
		return fmt.Errorf("invalid collection")
	}
	return s.collectionRepo.Delete(id)
}

func (s *CollectionService) GetAll(businessId, search string, page, limit int) ([]domain.Collection, int64, error) {
	return s.collectionRepo.GetAll(businessId, search, page, limit)
}
