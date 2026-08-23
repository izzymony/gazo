package mysql_repo

import (
	"gorm.io/gorm"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/ports"
)

type WithdrawalRequestRepository struct {
	db *gorm.DB
}

func NewWithdrawalRequestRepository(db *gorm.DB) ports.WithdrawalRequestInterface {
	return &WithdrawalRequestRepository{
		db: db,
	}
}
func (r *WithdrawalRequestRepository) Create(req *domain.WithdrawalRequest) error {
	return r.db.Create(req).Error
}

func (r *WithdrawalRequestRepository) FindByID(id string) (*domain.WithdrawalRequest, error) {
	var req domain.WithdrawalRequest
	if err := r.db.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "user_name", "email")
		}).
		Preload("User.Business", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name", "user_id")
		}).
		First(&req, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *WithdrawalRequestRepository) UpdateStatus(id, status, reason string) error {
	return r.db.Model(&domain.WithdrawalRequest{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status": status,
			"reason": reason,
		}).Error
}

func (r *WithdrawalRequestRepository) GetAll(limit, offset int) ([]domain.WithdrawalRequest, int64, error) {
	var requests []domain.WithdrawalRequest
	var total int64

	q := r.db.Model(&domain.WithdrawalRequest{})

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "user_name", "email", "firstname", "lastname", "phone")
		}).
		Preload("User.Business", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name", "user_id", "phone")
		}).
		Preload("BankAccountDetail").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&requests).Error
	if err != nil {
		return nil, 0, err
	}

	return requests, total, nil
}
