package mysql_repo

import (
	"fmt"

	"gorm.io/gorm"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/ports"
)

type TwilioCacheRepository struct {
	db *gorm.DB
}

func NewTwilioCacheRepository(db *gorm.DB) ports.TwilioCacheInterface {
	return &TwilioCacheRepository{
		db: db,
	}
}

func (r *TwilioCacheRepository) Create(data *domain.TwilioCache) (domain.TwilioCache, error) {
	if err := r.db.Create(data).Error; err != nil {
		return domain.TwilioCache{}, err
	}
	return *data, nil
}

func (r *TwilioCacheRepository) Find(id string) (domain.TwilioCache, error) {
	var data domain.TwilioCache
	if err := r.db.First(&data, "id = ?", id).Error; err != nil {
		return domain.TwilioCache{}, err
	}
	return data, nil
}

func (r *TwilioCacheRepository) GetOne(param map[string]interface{}) (*domain.TwilioCache, error) {
	var data domain.TwilioCache
	q := r.db.Model(&domain.TwilioCache{})

	for key, value := range param {
		if value != nil {
			q = q.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}

	if err := q.Order("created_at desc").First(&data).Error; err != nil {
		return nil, err
	}

	return &data, nil
}

func (r *TwilioCacheRepository) Update(id string, data domain.TwilioCache) (*domain.TwilioCache, error) {
	if err := r.db.Model(&domain.TwilioCache{}).Where("id = ?", id).Updates(data).Error; err != nil {
		return nil, err
	}

	updated, err := r.Find(id)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}
