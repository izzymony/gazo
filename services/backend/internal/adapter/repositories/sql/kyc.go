package mysql_repo

import (
	"strings"

	"gorm.io/gorm"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/ports"
)

type KYCRepository struct {
	db *gorm.DB
}

func NewKYCRepository(db *gorm.DB) ports.KYCRepoInterface {
	return &KYCRepository{
		db: db,
	}
}

func (r *KYCRepository) CreateKYC(kyc *domain.KYC) error {
	return r.db.Create(kyc).Error
}

func (r *KYCRepository) GetUserKYC(userID string) (*domain.KYC, error) {
	var kyc domain.KYC
	err := r.db.Where("user_id = ?", userID).Last(&kyc).Error
	if err != nil {
		return nil, err
	}
	return &kyc, nil
}

func (r *KYCRepository) UpdateKYCStatus(id, status, reason string) error {
	return r.db.Model(&domain.KYC{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status": status,
		"reason": reason,
	}).Error
}

func (r *KYCRepository) Find(id string) (*domain.KYC, error) {
	var kyc domain.KYC
	err := r.db.First(&kyc, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &kyc, nil
}

func (r *KYCRepository) Update(kyc *domain.KYC) error {
	return r.db.Save(kyc).Error
}

func (r *KYCRepository) FindAllKYC(limit, offset int, search string) ([]*domain.KYC, int64, error) {
	var kycs []*domain.KYC
	var total int64

	query := r.db.Table("kycs").
		Joins("JOIN users ON users.id = kycs.user_id")

	if search != "" {
		search = "%" + strings.ToLower(search) + "%"
		query = query.Where(`
			LOWER(users.user_name) LIKE ? OR
			LOWER(users.firstname) LIKE ? OR
			LOWER(users.lastname) LIKE ? OR
			LOWER(users.email) LIKE ?
		`, search, search, search, search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "user_name", "email", "firstname", "lastname")
		}).Limit(limit).
		Offset(offset).
		Order("kycs.created_at DESC").
		Find(&kycs).Error; err != nil {
		return nil, 0, err
	}

	return kycs, total, nil
}
