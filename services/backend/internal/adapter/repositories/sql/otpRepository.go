package mysql_repo

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OTPRepository struct {
	db *gorm.DB
}

func NewOTPRepository(db *gorm.DB) ports.OtpRepoIface {
	return &OTPRepository{
		db: db,
	}
}

func (repo *OTPRepository) GetAll(param map[string]interface{}) ([]domain.OTP, error) {
	model := repo.ArrayModel()

	q := repo.db.Preload(clause.Associations)

	q = repo.ApplyFilters(q, param)

	q.Find(&model).Order("created_at DESC")
	return model, q.Error
}

func (repo *OTPRepository) GetOne(param map[string]interface{}) (*domain.OTP, error) {

	q := repo.db.Preload(clause.Associations)

	q = repo.ApplyFilters(q, param)

	model := repo.Model()
	q.Find(&model).Order("created_at DESC")
	return &model, q.Error

}

func (repo *OTPRepository) ApplyFilters(query *gorm.DB, jsonParams map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParams["identifier"]) {
		query = query.Where("identifier = ? ", jsonParams["identifier"])
	}

	if helper.NotEmpty(jsonParams["code"]) {
		query = query.Where("code = ? ", jsonParams["code"])
	}

	if helper.NotEmpty(jsonParams["status"]) {
		query = query.Where("status = ? ", jsonParams["status"])
	}

	if helper.NotEmpty(jsonParams["request_type"]) {
		query = query.Where("request_type = ? ", jsonParams["request_type"])
	}

	return query
}

func (repo *OTPRepository) SearchField() []string {
	return []string{"name", "active"}
}

func (repo *OTPRepository) Find(id string) (domain.OTP, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("id = ?", id).First(&model)

	return model, q.Error
}

func (repo *OTPRepository) Create(data *domain.OTP) (domain.OTP, error) {
	model := repo.Model()
	q := repo.db.Model(model).Create(data)
	return *data, q.Error

}

func (repo *OTPRepository) Update(id string, data interface{}) (*domain.OTP, error) {
	q := repo.db.Where("id = ?", id).Updates(data)
	if q.Error != nil {
		return nil, q.Error
	}

	model, err := repo.Find(id)
	return &model, err
}

func (repo *OTPRepository) Delete(id string) (domain.OTP, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *OTPRepository) Model() domain.OTP {
	return domain.OTP{}
}

func (repo *OTPRepository) ArrayModel() []domain.OTP {
	return []domain.OTP{}
}
