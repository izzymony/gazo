package mysql_repo

import (
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/ports"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProductRatingRepository struct {
	db *gorm.DB
}

func NewProductRatingRepository(db *gorm.DB) ports.ProductRatingRatingRepoIface {
	return &ProductRatingRepository{
		db: db,
	}
}

func (repo *ProductRatingRepository) GetAll(param map[string]interface{}) ([]domain.ProductRating, error) {
	model := repo.ArrayModel()

	q := repo.db.Preload(clause.Associations)

	q = repo.ApplyFilters(q, param)

	q.Find(&model).Order("created_at DESC")
	return model, q.Error
}

func (repo *ProductRatingRepository) GetOne(param map[string]interface{}) (*domain.ProductRating, error) {

	q := repo.db.Preload(clause.Associations)

	q = repo.ApplyFilters(q, param)

	model := repo.Model()
	q.Find(&model).Order("created_at DESC")
	return &model, q.Error

}

func (repo *ProductRatingRepository) ApplyFilters(query *gorm.DB, jsonParams map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParams["user_id"]) {
		query = query.Where("user_id = ? ", jsonParams["user_id"])
	}

	if helper.NotEmpty(jsonParams["product_id"]) {
		query = query.Where("product_id = ? ", jsonParams["product_id"])
	}

	if helper.NotEmpty(jsonParams["is_blocked"]) {
		query = query.Where("is_blocked = ? ", jsonParams["is_blocked"])
	}

	return query
}

func (repo *ProductRatingRepository) SearchField() []string {
	return []string{"comment"}
}

func (repo *ProductRatingRepository) Find(id string) (domain.ProductRating, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("id = ?", id).First(&model)

	return model, q.Error
}

func (repo *ProductRatingRepository) Create(data *domain.ProductRating) (domain.ProductRating, error) {
	model := repo.Model()
	q := repo.db.Model(model).Create(data)
	return *data, q.Error

}

func (repo *ProductRatingRepository) Update(id string, data interface{}) (*domain.ProductRating, error) {
	q := repo.db.Where("id = ?", id).Updates(data)
	if q.Error != nil {
		return nil, q.Error
	}

	model, err := repo.Find(id)
	return &model, err
}

func (repo *ProductRatingRepository) Delete(id string) (domain.ProductRating, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *ProductRatingRepository) Model() domain.ProductRating {
	return domain.ProductRating{}
}

func (repo *ProductRatingRepository) ArrayModel() []domain.ProductRating {
	return []domain.ProductRating{}
}
