package mysql_repo

import (
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type AdminRepository struct {
	db *gorm.DB
}

func NewAdminRepository(db *gorm.DB) ports.AdminInterface {
	return &AdminRepository{
		db: db,
	}
}

func (repo *AdminRepository) GetOne(param map[string]interface{}) (*domain.Admin, error) {
	tableName := "admins"

	var data domain.Admin
	query := repo.db.Table(tableName)

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.First(&data).Error; err != nil {
		return nil, err
	}

	return &data, nil
}
