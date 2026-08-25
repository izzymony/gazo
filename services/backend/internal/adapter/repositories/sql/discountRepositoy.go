package mysql_repo

import (
	"strings"

	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type DiscountRepository struct {
	db *gorm.DB
}

func NewDiscountRepository(db *gorm.DB) ports.DiscountInterface {
	return &DiscountRepository{
		db: db,
	}
}

func (r *DiscountRepository) Create(data *domain.Discount) (domain.Discount, error) {
	if err := r.db.Create(data).Error; err != nil {
		return domain.Discount{}, err
	}
	return *data, nil
}

func (r *DiscountRepository) Find(id string) (domain.Discount, error) {
	var discount domain.Discount
	if err := r.db.Preload("Products").First(&discount, "id = ?", id).Error; err != nil {
		return domain.Discount{}, err
	}
	return discount, nil
}

func (r *DiscountRepository) GetAll(param map[string]interface{}) ([]domain.Discount, error) {
	var discounts []domain.Discount
	tx := r.db.Preload("Products")
	for k, v := range param {
		tx = tx.Where(k+" = ?", v)
	}
	if err := tx.Find(&discounts).Error; err != nil {
		return nil, err
	}
	return discounts, nil
}

func (r *DiscountRepository) GetAllPaginated(search string, page, limit int) ([]domain.Discount, int64, error) {
	var discounts []domain.Discount
	var total int64

	offset := (page - 1) * limit
	tx := r.db.Model(&domain.Discount{}).Preload("Products")

	if search != "" {
		tx = tx.Where("title ILIKE ? OR code ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	tx.Count(&total)

	if err := tx.Offset(offset).Limit(limit).Find(&discounts).Error; err != nil {
		return nil, 0, err
	}

	return discounts, total, nil
}

func (r *DiscountRepository) Update(id string, data domain.Discount) (*domain.Discount, error) {
	var discount domain.Discount
	if err := r.db.First(&discount, "id = ?", id).Error; err != nil {
		return nil, err
	}

	if err := r.db.Model(&discount).Updates(data).Error; err != nil {
		return nil, err
	}

	if len(data.Products) > 0 {
		if err := r.db.Model(&discount).Association("Products").Replace(data.Products); err != nil {
			return nil, err
		}
	}

	var d domain.Discount
	if err := r.db.First(&d, "id = ?", discount.ID).Error; err != nil {
		return nil, err
	}

	return &d, nil
}

func (r *DiscountRepository) Delete(id string) (domain.Discount, error) {
	var discount domain.Discount
	if err := r.db.Preload("Products").First(&discount, "id = ?", id).Error; err != nil {
		return domain.Discount{}, err
	}

	if err := r.db.Delete(&discount).Error; err != nil {
		return domain.Discount{}, err
	}

	return discount, nil
}

func (r *DiscountRepository) GetOne(param map[string]interface{}) (*domain.Discount, error) {
	var discount domain.Discount
	tx := r.db.Preload("Products")
	for k, v := range param {
		tx = tx.Where(k+" = ?", v)
	}
	if err := tx.First(&discount).Error; err != nil {
		return nil, err
	}
	return &discount, nil
}

func (r *DiscountRepository) GetDiscounts(params map[string]interface{}, search string, page, limit int) ([]domain.Discount, int64, error) {
	var data []domain.Discount
	var total int64

	query := r.db.
		Model(&domain.Discount{}).
		Preload("Products")

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(discounts.title) LIKE ? OR "+
				"LOWER(discounts.code) LIKE ? OR "+
				"LOWER(discounts.discount_type) LIKE ?",
			searchTerm, searchTerm, searchTerm,
		)
	}

	for field, value := range params {
		if helper.NotEmpty(value) && field != "page" && field != "limit" {
			query = query.Where("discounts."+field+" = ?", value)
		}
	}

	countQuery := r.db.Model(&domain.Discount{})

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where(
			"LOWER(discounts.title) LIKE ? OR "+
				"LOWER(discounts.code) LIKE ? OR "+
				"LOWER(discounts.discount_type) LIKE ?",
			searchTerm, searchTerm, searchTerm,
		)
	}

	for field, value := range params {
		if helper.NotEmpty(value) && field != "page" && field != "limit" {
			countQuery = countQuery.Where("discounts."+field+" = ?", value)
		}
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.
		Limit(limit).
		Offset(offset).
		Order("discounts.created_at DESC").
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}
