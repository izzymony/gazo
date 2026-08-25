package mysql_repo

import (
	"fmt"
	"strings"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) ports.UserRepoInterface {
	return &UserRepository{
		db: db,
	}
}

func (repo *UserRepository) GetAll(param map[string]interface{}) ([]domain.User, error) {
	var users []domain.User
	query := repo.db.Preload(clause.Associations)

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}

func (repo *UserRepository) GetOne(param map[string]interface{}, isGuest bool) (*domain.User, error) {
	tableName := "users"
	if isGuest {
		tableName += "_guest"
	}

	var user domain.User
	query := repo.db.Table(tableName).Preload(clause.Associations)

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (repo *UserRepository) ApplyFilters(query *gorm.DB, jsonParams map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParams["search"]) {
		search := "%" + helper.ToString(jsonParams["search"]) + "%"
		queryB := SearchQuery(query, search, repo.SearchField())
		query = queryB
	}

	if helper.NotEmpty(jsonParams["phone"]) {
		query = query.Where("phone = ? ", jsonParams["phone"])
	}

	if helper.NotEmpty(jsonParams["email"]) {
		query = query.Where("email = ? ", jsonParams["email"])
	}
	if helper.NotEmpty(jsonParams["user_name"]) {
		query = query.Where("user_name = ? ", jsonParams["user_name"])
	}

	return query
}

func SearchQuery(queryB *gorm.DB, search string, searchField []string) *gorm.DB {

	for i := 0; i < len(searchField); i++ {

		if i == 0 {
			queryB = queryB.Where(searchField[i]+" like ? ", search)
		} else {
			queryB = queryB.Or(searchField[i]+" like ? ", search)
		}
	}

	return queryB
}

func (repo *UserRepository) SearchField() []string {
	return []string{"name", "active"}
}

func (repo *UserRepository) Find(id string) (domain.User, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("id = ?", id).First(&model)

	return model, q.Error
}

func (repo *UserRepository) Create(data *domain.User) (domain.User, error) {
	model := repo.Model()
	q := repo.db.Model(model).Create(data)
	return *data, q.Error
}

func (repo *UserRepository) Update(id string, data interface{}) (*domain.User, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Updates(data)
	if q.Error != nil {
		return nil, q.Error
	}
	model, err := repo.Find(id)
	return &model, err
}

func (repo *UserRepository) Delete(id string) (domain.User, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *UserRepository) Model() domain.User {
	return domain.User{}
}

func (repo *UserRepository) ArrayModel() []domain.User {
	return []domain.User{}
}

func (repo *UserRepository) GetFollowing(userId, search string, page, limit int, isGuest bool) ([]domain.Business, int64, error) {
	var businesses []domain.Business
	var total int64

	tableName := "followers"
	if isGuest {
		tableName = "followers_guest"
	}

	query := repo.db.Table("businesses").
		Select("businesses.*").
		Joins("JOIN "+tableName+" ON "+tableName+".business_id = businesses.id").
		Where(tableName+".user_id = ?", userId)

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(businesses.name) LIKE ?", searchPattern)
	}

	countQuery := repo.db.Table("businesses").
		Select("COUNT(*)").
		Joins("JOIN "+tableName+" ON "+tableName+".business_id = businesses.id").
		Where(tableName+".user_id = ?", userId)

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where("LOWER(businesses.name) LIKE ?", searchPattern)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count followed businesses: %w", err)
	}

	offset := (page - 1) * limit
	if err := query.
		Limit(limit).
		Offset(offset).
		Find(&businesses).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to get followed businesses: %w", err)
	}

	return businesses, total, nil
}

func (repo *UserRepository) GetAllUsers(search string, page, limit int) ([]domain.User, int64, error) {
	var regularUsers []domain.User
	var guestUsers []domain.User
	var total int64

	offset := (page - 1) * limit
	likeSearch := "%" + search + "%"

	regularQuery := repo.db.Model(&domain.User{})
	if search != "" {
		regularQuery = regularQuery.Where("email ILIKE ? OR phone ILIKE ? OR user_name ILIKE ?", likeSearch, likeSearch, likeSearch)
	}
	if err := regularQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := regularQuery.
		Preload("Business", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name", "user_id")
		}).
		Order("created_at DESC").
		Find(&regularUsers).Error; err != nil {
		return nil, 0, err
	}

	guestQuery := repo.db.Table("users_guest").Model(&domain.User{})
	if search != "" {
		guestQuery = guestQuery.Where("email ILIKE ? OR phone ILIKE ? OR user_name ILIKE ?", likeSearch, likeSearch, likeSearch)
	}
	var guestCount int64
	if err := guestQuery.Count(&guestCount).Error; err != nil {
		return nil, 0, err
	}
	if err := guestQuery.
		Order("created_at DESC").
		Find(&guestUsers).Error; err != nil {
		return nil, 0, err
	}

	total += guestCount

	allUsers := append(regularUsers, guestUsers...)

	if offset >= len(allUsers) {
		return []domain.User{}, total, nil
	}

	end := offset + limit
	if end > len(allUsers) {
		end = len(allUsers)
	}

	return allUsers[offset:end], total, nil
}

func (repo *UserRepository) UpdateUser(id string, data map[string]interface{}, isGuest bool) error {
	table := "users"
	if isGuest {
		table = "users_guest"
	}
	return repo.db.Table(table).Where("id = ?", id).Updates(data).Error
}

func (repo *UserRepository) DeleteUser(id string, isGuest bool) error {
	table := "users"
	if isGuest {
		table = "users_guest"
	}
	return repo.db.Table(table).Where("id = ?", id).Delete(nil).Error
}
