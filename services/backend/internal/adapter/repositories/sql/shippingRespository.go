package mysql_repo

import (
	"errors"
	"fmt"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
	"gorm.io/gorm/clause"

	"gorm.io/gorm"
)

type ShippingRepository struct {
	db *gorm.DB
}

func NewShippingRepository(db *gorm.DB) ports.ShippingInterface {
	return &ShippingRepository{
		db: db,
	}
}

func (repo *ShippingRepository) AddShippingProfile(input *domain.ShippingProfile, isGuest bool) (*domain.ShippingProfile, error) {
	tableName := "shipping_profiles"
	if isGuest {
		tableName += "_guest"
	}

	err := database.WithTransaction(repo.db.Table(tableName), "add_shipping_profile",
		func(tx *gorm.DB) error {
			if input.IsDefault {
				if err := tx.Model(&domain.ShippingProfile{}).
					Where("user_id = ?", input.UserID).
					Update("is_default", false).Error; err != nil {
					return err
				}
			}

			if err := tx.Create(&input).Error; err != nil {
				return err
			}

			input.ShippingUser.ShippingProfileID = input.ID
			return nil
		})
	if err != nil {
		return nil, err
	}
	return input, nil
}

func (repo *ShippingRepository) UpdateShippingProfile(id string, input domain.ShippingProfile, isGuest bool) (*domain.ShippingProfile, error) {
	tableName := "shipping_profiles"
	if isGuest {
		tableName += "_guest"
	}

	var profile domain.ShippingProfile
	err := database.WithTransaction(repo.db.Table(tableName), "update_shipping_profile",
		func(tx *gorm.DB) error {
			if err := tx.First(&profile, "id = ?", id).Error; err != nil {
				return err
			}

			helper.Copy(input, &profile)

			if profile.IsDefault {
				if err := tx.Model(&domain.ShippingProfile{}).
					Where("user_id = ? AND id != ?", profile.UserID, id).
					Update("is_default", false).Error; err != nil {
					return err
				}
			}

			return tx.Save(&profile).Error
		})
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

func (repo *ShippingRepository) DeleteShippingProfile(id string, isGuest bool) error {
	tableName := "shipping_profiles"
	if isGuest {
		tableName += "_guest"
	}

	// This opened a transaction and returned without ever committing OR rolling
	// back, so the DELETE was never durable and the connection was held until
	// the pool reclaimed it — while the caller was told the delete succeeded.
	return database.WithTransaction(repo.db.Table(tableName), "delete_shipping_profile",
		func(tx *gorm.DB) error {
			return tx.Where("id = ?", id).Delete(&domain.ShippingProfile{}).Error
		})
}

func (repo *ShippingRepository) FindShippingProfile(id string, isGuest bool) (*domain.ShippingProfile, error) {
	tableName := "shipping_profiles"
	if isGuest {
		tableName += "_guest"
	}

	var profile domain.ShippingProfile
	if err := repo.db.Table(tableName).Preload(clause.Associations).Where("id = ?", id).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (repo *ShippingRepository) GetAllShippingProfiles(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.ShippingProfile, int64, error) {
	tableName := "shipping_profiles"
	if isGuest {
		tableName += "_guest"
	}

	var profiles []domain.ShippingProfile
	var total int64

	query := repo.db.Table(tableName).Preload(clause.Associations)
	query = repo.ApplyFilters(query, params)

	if err := query.Model(&domain.ShippingProfile{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Order("updated_at desc").Find(&profiles).Error; err != nil {
		return nil, 0, err
	}

	return profiles, total, nil
}

func (repo *ShippingRepository) ApplyFilters(query *gorm.DB, params map[string]interface{}) *gorm.DB {
	if helper.NotEmpty(params["user_id"]) {
		query = query.Where("user_id = ?", params["user_id"])
	}
	if helper.NotEmpty(params["search"]) {
		search := "%" + helper.ToString(params["search"]) + "%"
		query = query.Where("street LIKE ? OR town LIKE ? OR state LIKE ?", search, search, search)
	}
	return query
}

func (repo *ShippingRepository) FindByFields(filters map[string]interface{}, isGuest bool) ([]domain.ShippingProfile, error) {
	tableName := "shipping_profiles"
	if isGuest {
		tableName += "_guest"
	}

	var profiles []domain.ShippingProfile
	query := repo.db.Table(tableName).Preload(clause.Associations)

	for field, value := range filters {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.Find(&profiles).Error; err != nil {
		return nil, err
	}

	return profiles, nil
}

func (repo *ShippingRepository) FindExternalCategoryById(id string) (*domain.ExternalCategory, error) {
	var category domain.ExternalCategory
	err := repo.db.Table("external_categories").Where("id = ?", id).First(&category).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Graceful fallback to default Electronics category for missing mappings
			fmt.Printf("🔥 SHIPPING DEBUG: External category '%s' not found, using default Electronics category\n", id)
			return &domain.ExternalCategory{
				ProviderId: "3035980", // Electronics category
				Provider:   "shipbubble",
				Name:       "Electronics",
			}, nil
		}
		return nil, fmt.Errorf("database error finding external category: %v", err)
	}

	// Validate that the category has required fields
	if category.ProviderId == "" {
		return nil, fmt.Errorf("external category '%s' has no provider_id", id)
	}

	return &category, nil
}

func (repo *ShippingRepository) FindCategoryById(id string) (*domain.Category, error) {
	var category domain.Category
	err := repo.db.Table("categories").Where("id = ?", id).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (repo *ShippingRepository) CreateShippingRates(data []domain.ShippingOption, isGuest bool) ([]domain.ShippingOption, error) {
	if len(data) == 0 {
		return nil, errors.New("no shipping options provided")
	}

	tableName := "shipping_options"
	if isGuest {
		tableName += "_guest"
	}

	err := database.WithTransaction(repo.db, "create_shipping_rates", func(tx *gorm.DB) error {
		if err := tx.Table(tableName).Create(&data).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return data, nil
}

func (repo *ShippingRepository) GetShippingRates(filters map[string]interface{}, isGuest bool) ([]domain.ShippingOption, error) {
	tableName := "shipping_options"
	if isGuest {
		tableName += "_guest"
	}

	var shippingRates []domain.ShippingOption
	query := repo.db.Table(tableName)

	for key, value := range filters {
		query = query.Where(key+" = ?", value)
	}

	if err := query.Find(&shippingRates).Error; err != nil {
		return nil, err
	}

	return shippingRates, nil
}

func (repo *ShippingRepository) GetOneShippingRate(filter map[string]interface{}, isGuest bool) (*domain.ShippingOption, error) {
	tableName := "shipping_options"
	if isGuest {
		tableName += "_guest"
	}

	var shippingRate domain.ShippingOption
	query := repo.db.Table(tableName)

	for key, value := range filter {
		query = query.Where(key+" = ?", value)
		break
	}

	if err := query.First(&shippingRate).Error; err != nil {
		return nil, err
	}

	return &shippingRate, nil
}

func (repo *ShippingRepository) CreateShipment(data *domain.Shipment, isGuest bool) (*domain.Shipment, error) {
	tableName := "shipments"
	if isGuest {
		tableName += "_guest"
	}

	if err := repo.db.Table(tableName).Create(data).Error; err != nil {
		return nil, err
	}
	return data, nil
}

func (repo *ShippingRepository) GetAllShipments(filters map[string]interface{}, isGuest bool, page, limit int) ([]domain.Shipment, int64, error) {
	tableName := "shipments"
	if isGuest {
		tableName += "_guest"
	}

	var shipments []domain.Shipment
	var total int64

	query := repo.db.Table(tableName).Preload(clause.Associations)

	for key, value := range filters {
		if helper.NotEmpty(value) {
			query = query.Where(key+" = ?", value)
		}
	}

	if err := query.Model(&domain.Shipment{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit

	if err := query.Limit(limit).Offset(offset).Order("updated_at desc").Find(&shipments).Error; err != nil {
		return nil, 0, err
	}

	return shipments, total, nil
}

func (repo *ShippingRepository) GetOneShipment(filter map[string]interface{}, isGuest bool) (*domain.Shipment, error) {
	tableName := "shipments"
	if isGuest {
		tableName += "_guest"
	}

	var shipment domain.Shipment
	query := repo.db.Table(tableName)

	for key, value := range filter {
		query = query.Where(key+" = ?", value)
		break
	}

	if err := query.First(&shipment).Error; err != nil {
		return nil, err
	}

	return &shipment, nil
}

func (repo *ShippingRepository) GetMostFrequentShippingAddress(userID string) (*domain.ShippingProfile, error) {
	var shippingProfile domain.ShippingProfile

	err := repo.db.Raw(`
    SELECT sp.* FROM shipping_profiles sp
    JOIN (
      SELECT shipping_profile_id, COUNT(shipping_profile_id) as count
      FROM orders
      WHERE user_id = ?
      GROUP BY shipping_profile_id
      ORDER BY count DESC
      LIMIT 1
    ) most_used ON sp.id = most_used.shipping_profile_id
    `, userID).Scan(&shippingProfile).Error

	if err != nil {
		return nil, err
	}

	return &shippingProfile, nil
}

func (repo *ShippingRepository) UpdateShipmentProviderData(id string, providerData domain.MapArray) error {
	result := repo.db.Table("shipments").Where("id = ?", id).Update("provider_data", providerData)
	if result.Error != nil {
		return result.Error
	}
	return nil
}
