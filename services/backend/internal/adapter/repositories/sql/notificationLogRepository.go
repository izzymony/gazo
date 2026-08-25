package mysql_repo

import (
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type NotificationLogRepository struct {
	db *gorm.DB
}

func NewNotificationLogRepository(db *gorm.DB) ports.NotificationLogInterface {
	return &NotificationLogRepository{db: db}
}

func (r *NotificationLogRepository) Create(log *domain.NotificationLog) error {
	return r.db.Create(log).Error
}

func (r *NotificationLogRepository) Update(log *domain.NotificationLog) error {
	return r.db.Save(log).Error
}

func (r *NotificationLogRepository) GetByID(id string) (*domain.NotificationLog, error) {
	var log domain.NotificationLog
	err := r.db.Where("id = ?", id).First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *NotificationLogRepository) GetByWhatsAppMessageID(messageID string) (*domain.NotificationLog, error) {
	var log domain.NotificationLog
	err := r.db.Where("whats_app_message_id = ?", messageID).First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *NotificationLogRepository) GetByReference(referenceID, referenceType string) ([]domain.NotificationLog, error) {
	var logs []domain.NotificationLog
	query := r.db.Where("reference_id = ?", referenceID)
	if referenceType != "" {
		query = query.Where("reference_type = ?", referenceType)
	}
	err := query.Order("created_at DESC").Find(&logs).Error
	return logs, err
}

func (r *NotificationLogRepository) GetByUser(userID string, page, limit int) ([]domain.NotificationLog, int64, error) {
	var logs []domain.NotificationLog
	var total int64

	query := r.db.Model(&domain.NotificationLog{}).Where("user_id = ?", userID)

	err := query.Count(&total).
		Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&logs).Error

	return logs, total, err
}

func (r *NotificationLogRepository) GetFailedLogs(page, limit int) ([]domain.NotificationLog, int64, error) {
	var logs []domain.NotificationLog
	var total int64

	query := r.db.Model(&domain.NotificationLog{}).Where("status = ?", domain.StatusFailed)

	err := query.Count(&total).
		Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&logs).Error

	return logs, total, err
}

func (r *NotificationLogRepository) GetByStatus(status string, page, limit int) ([]domain.NotificationLog, int64, error) {
	var logs []domain.NotificationLog
	var total int64

	query := r.db.Model(&domain.NotificationLog{}).Where("status = ?", status)

	err := query.Count(&total).
		Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&logs).Error

	return logs, total, err
}

func (r *NotificationLogRepository) GetCostSummary(startDate, endDate string) (map[string]float64, error) {
	var results []struct {
		ChannelDelivered string
		TotalCost        float64
	}

	err := r.db.Model(&domain.NotificationLog{}).
		Select("channel_delivered, SUM(estimated_cost) as total_cost").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Where("channel_delivered IS NOT NULL AND channel_delivered != ''").
		Group("channel_delivered").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	summary := make(map[string]float64)
	for _, r := range results {
		summary[r.ChannelDelivered] = r.TotalCost
	}
	return summary, nil
}

func (r *NotificationLogRepository) GetChannelStats(startDate, endDate string) (map[string]int64, error) {
	var results []struct {
		ChannelDelivered string
		Count            int64
	}

	err := r.db.Model(&domain.NotificationLog{}).
		Select("channel_delivered, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Where("channel_delivered IS NOT NULL AND channel_delivered != ''").
		Group("channel_delivered").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	stats := make(map[string]int64)
	for _, r := range results {
		stats[r.ChannelDelivered] = r.Count
	}
	return stats, nil
}
