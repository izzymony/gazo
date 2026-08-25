package mysql_repo

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type CollectionRepository struct {
	db *gorm.DB
}

func NewCollectionRepository(db *gorm.DB) ports.CollectionInterface {
	return &CollectionRepository{db}
}

func (r *CollectionRepository) Create(c *domain.Collection) (*domain.Collection, error) {
	if err := r.db.Create(c).Error; err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CollectionRepository) GetByID(id string) (*domain.Collection, error) {
	var c domain.Collection
	if err := r.db.First(&c, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CollectionRepository) Update(id string, updateData *domain.Collection) error {
	return r.db.Model(&domain.Collection{}).Where("id = ?", id).Updates(updateData).Error
}

func (r *CollectionRepository) Delete(id string) error {
	return r.db.Delete(&domain.Collection{}, "id = ?", id).Error
}

func (r *CollectionRepository) GetAll(businessId, search string, page, limit int) ([]domain.Collection, int64, error) {
	var data []domain.Collection
	var total int64
	query := r.db.Model(&domain.Collection{}).Where("business_id = ?", businessId)

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(name) LIKE ?", searchTerm)
	}

	query.Count(&total)
	offset := (page - 1) * limit
	err := query.Limit(limit).Offset(offset).Order("created_at DESC").Find(&data).Error
	return data, total, err
}

func (r *CollectionRepository) GetOne(param map[string]interface{}) (*domain.Collection, error) {
	var model domain.Collection

	query := r.db.Model(&domain.Collection{}).Preload(clause.Associations)

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(fmt.Sprintf("%s = ?", field), value)
		}
	}

	if err := query.First(&model).Error; err != nil {
		return nil, err
	}

	return &model, nil
}

func (r *CollectionRepository) Model() domain.Collection {
	return domain.Collection{}
}
