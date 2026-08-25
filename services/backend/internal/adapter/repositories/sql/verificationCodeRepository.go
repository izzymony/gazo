package mysql_repo

import (
	"fmt"

	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type VerificationCodeRepository struct {
	db *gorm.DB
}

func NewVerificationCodeRepository(db *gorm.DB) ports.VerificationCodeInterface {
	return &VerificationCodeRepository{
		db: db,
	}
}

func (r *VerificationCodeRepository) Create(data *domain.VerificationCode) (domain.VerificationCode, error) {
	if err := r.db.Create(data).Error; err != nil {
		return domain.VerificationCode{}, err
	}
	return *data, nil
}

func (r *VerificationCodeRepository) Find(id string) (domain.VerificationCode, error) {
	var data domain.VerificationCode
	if err := r.db.First(&data, "id = ?", id).Error; err != nil {
		return domain.VerificationCode{}, err
	}
	return data, nil
}

func (r *VerificationCodeRepository) GetOne(param map[string]interface{}) (*domain.VerificationCode, error) {
	var data domain.VerificationCode
	q := r.db.Model(&domain.VerificationCode{})

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

func (r *VerificationCodeRepository) Update(id string, data domain.VerificationCode) (*domain.VerificationCode, error) {
	if err := r.db.Model(&domain.VerificationCode{}).Where("id = ?", id).Updates(data).Error; err != nil {
		return nil, err
	}

	updated, err := r.Find(id)
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *VerificationCodeRepository) MarkAsUsed(id string) error {
	err := r.db.Model(&domain.VerificationCode{}).
		Where("id = ?", id).
		Update("used", true).Error

	if err != nil {
		return fmt.Errorf("failed to mark verification code as used: %w", err)
	}
	return nil
}

func (r *VerificationCodeRepository) MarkAllVerificationCodeAsUsed(userId, verificationType string) error {
	return r.db.Model(&domain.VerificationCode{}).
		Where("identifier = ? AND type = ? AND used = ?", userId, verificationType, false).
		Update("used", true).Error
}

func (r *VerificationCodeRepository) VerifyCode(userId, codeType, uuid string) error {
	var code domain.VerificationCode
	err := r.db.Where("identifier = ? AND type = ? AND uuid = ? AND used = ?", userId, codeType, uuid, false).
		First(&code).Error
	if err != nil {
		return fmt.Errorf("invalid or expired code")
	}

	if err := r.db.Model(&domain.VerificationCode{}).
		Where("id = ?", code.ID).
		Update("used", true).Error; err != nil {
		return fmt.Errorf("failed to mark code as used")
	}

	return nil
}
