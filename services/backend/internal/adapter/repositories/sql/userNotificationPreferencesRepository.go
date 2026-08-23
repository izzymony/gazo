package mysql_repo

import (
	"errors"

	"gorm.io/gorm"
	"insta-api/internal/core/domain"
	"insta-api/internal/ports"
)

type UserNotificationPreferencesRepository struct {
	db *gorm.DB
}

func NewUserNotificationPreferencesRepository(db *gorm.DB) ports.UserNotificationPreferencesInterface {
	return &UserNotificationPreferencesRepository{db: db}
}

func (r *UserNotificationPreferencesRepository) Create(prefs *domain.UserNotificationPreferences) error {
	return r.db.Create(prefs).Error
}

func (r *UserNotificationPreferencesRepository) Update(prefs *domain.UserNotificationPreferences) error {
	return r.db.Save(prefs).Error
}

func (r *UserNotificationPreferencesRepository) GetByUserID(userID string) (*domain.UserNotificationPreferences, error) {
	var prefs domain.UserNotificationPreferences
	err := r.db.Where("user_id = ?", userID).First(&prefs).Error
	if err != nil {
		return nil, err
	}
	return &prefs, nil
}

func (r *UserNotificationPreferencesRepository) GetOrCreate(userID string) (*domain.UserNotificationPreferences, error) {
	prefs, err := r.GetByUserID(userID)
	if err == nil {
		return prefs, nil
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create default preferences
		prefs = domain.DefaultNotificationPreferences(userID)
		if err := r.Create(prefs); err != nil {
			return nil, err
		}
		return prefs, nil
	}

	return nil, err
}

func (r *UserNotificationPreferencesRepository) UpdateChannelPreference(userID string, channel string, enabled bool) error {
	var columnName string
	switch channel {
	case "whatsapp":
		columnName = "whats_app_enabled"
	case "email":
		columnName = "email_enabled"
	case "sms":
		columnName = "sms_enabled"
	default:
		return errors.New("invalid channel")
	}

	return r.db.Model(&domain.UserNotificationPreferences{}).
		Where("user_id = ?", userID).
		Update(columnName, enabled).Error
}

func (r *UserNotificationPreferencesRepository) UpdateCategoryPreference(userID string, category string, enabled bool) error {
	var columnName string
	switch category {
	case "order_updates":
		columnName = "order_updates"
	case "seller_alerts":
		columnName = "seller_alerts"
	case "security_alerts":
		columnName = "security_alerts"
	case "promotional_messages":
		columnName = "promotional_messages"
	default:
		return errors.New("invalid category")
	}

	return r.db.Model(&domain.UserNotificationPreferences{}).
		Where("user_id = ?", userID).
		Update(columnName, enabled).Error
}
