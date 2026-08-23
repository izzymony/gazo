package ports

import (
	"vibaar/backend/internal/core/domain"
)

// NotificationTemplateInterface defines methods for managing notification templates
type NotificationTemplateInterface interface {
	Create(template *domain.NotificationTemplate) error
	Update(template *domain.NotificationTemplate) error
	Delete(id string) error
	GetByID(id string) (*domain.NotificationTemplate, error)
	GetByName(name string) (*domain.NotificationTemplate, error)
	GetByEventAndChannel(eventType, channel string) (*domain.NotificationTemplate, error)
	GetAllByEvent(eventType string) ([]domain.NotificationTemplate, error)
	GetActiveTemplates() ([]domain.NotificationTemplate, error)
	SetActiveStatus(id string, isActive bool) error
}

// NotificationLogInterface defines methods for tracking notification delivery
type NotificationLogInterface interface {
	Create(log *domain.NotificationLog) error
	Update(log *domain.NotificationLog) error
	GetByID(id string) (*domain.NotificationLog, error)
	GetByWhatsAppMessageID(messageID string) (*domain.NotificationLog, error)
	GetByReference(referenceID, referenceType string) ([]domain.NotificationLog, error)
	GetByUser(userID string, page, limit int) ([]domain.NotificationLog, int64, error)
	GetFailedLogs(page, limit int) ([]domain.NotificationLog, int64, error)
	GetByStatus(status string, page, limit int) ([]domain.NotificationLog, int64, error)
	GetCostSummary(startDate, endDate string) (map[string]float64, error)
	GetChannelStats(startDate, endDate string) (map[string]int64, error)
}

// UserNotificationPreferencesInterface defines methods for user notification preferences
type UserNotificationPreferencesInterface interface {
	Create(prefs *domain.UserNotificationPreferences) error
	Update(prefs *domain.UserNotificationPreferences) error
	GetByUserID(userID string) (*domain.UserNotificationPreferences, error)
	GetOrCreate(userID string) (*domain.UserNotificationPreferences, error)
	UpdateChannelPreference(userID string, channel string, enabled bool) error
	UpdateCategoryPreference(userID string, category string, enabled bool) error
}
