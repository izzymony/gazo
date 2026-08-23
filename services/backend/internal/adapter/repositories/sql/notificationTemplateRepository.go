package mysql_repo

import (
	"gorm.io/gorm"
	"insta-api/internal/core/domain"
	"insta-api/internal/ports"
)

type NotificationTemplateRepository struct {
	db *gorm.DB
}

func NewNotificationTemplateRepository(db *gorm.DB) ports.NotificationTemplateInterface {
	return &NotificationTemplateRepository{db: db}
}

func (r *NotificationTemplateRepository) Create(template *domain.NotificationTemplate) error {
	return r.db.Create(template).Error
}

func (r *NotificationTemplateRepository) Update(template *domain.NotificationTemplate) error {
	return r.db.Save(template).Error
}

func (r *NotificationTemplateRepository) Delete(id string) error {
	return r.db.Delete(&domain.NotificationTemplate{}, "id = ?", id).Error
}

func (r *NotificationTemplateRepository) GetByID(id string) (*domain.NotificationTemplate, error) {
	var template domain.NotificationTemplate
	err := r.db.Where("id = ?", id).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *NotificationTemplateRepository) GetByName(name string) (*domain.NotificationTemplate, error) {
	var template domain.NotificationTemplate
	err := r.db.Where("name = ? AND is_active = ?", name, true).First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *NotificationTemplateRepository) GetByEventAndChannel(eventType, channel string) (*domain.NotificationTemplate, error) {
	var template domain.NotificationTemplate
	err := r.db.Where("event_type = ? AND channel = ? AND is_active = ?", eventType, channel, true).
		First(&template).Error
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *NotificationTemplateRepository) GetAllByEvent(eventType string) ([]domain.NotificationTemplate, error) {
	var templates []domain.NotificationTemplate
	err := r.db.Where("event_type = ? AND is_active = ?", eventType, true).
		Order("priority ASC").
		Find(&templates).Error
	return templates, err
}

func (r *NotificationTemplateRepository) GetActiveTemplates() ([]domain.NotificationTemplate, error) {
	var templates []domain.NotificationTemplate
	err := r.db.Where("is_active = ?", true).Order("event_type, priority").Find(&templates).Error
	return templates, err
}

func (r *NotificationTemplateRepository) SetActiveStatus(id string, isActive bool) error {
	return r.db.Model(&domain.NotificationTemplate{}).
		Where("id = ?", id).
		Update("is_active", isActive).Error
}
