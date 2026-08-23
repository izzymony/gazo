package mysql_repo

import (
	"fmt"

	"gorm.io/gorm"
	"insta-api/internal/core/domain"
	"insta-api/internal/ports"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) ports.NotificationInterface {
	return &NotificationRepository{
		db: db,
	}
}

func (r *NotificationRepository) Create(notification *domain.Notification) error {
	return r.db.Create(notification).Error
}

func (r *NotificationRepository) FindByUser(userId, notificationType, audience string, page, limit int) ([]domain.Notification, int64, error) {
	var notifications []domain.Notification
	var total int64

	query := r.db.Model(&domain.Notification{}).Where("user_id = ?", userId)

	if notificationType != "" {
		query = query.Where("type = ?", notificationType)
	}
	if audience != "" {
		query = query.Where("audience = ?", audience)
	}

	err := query.Count(&total).Order("created_at DESC").
		Offset((page - 1) * limit).Limit(limit).Find(&notifications).Error

	return notifications, total, err
}

func (r *NotificationRepository) MarkAsRead(userId string, notificationId string) error {
	return r.db.Model(&domain.Notification{}).
		Where("user_id = ? AND id = ?", userId, notificationId).
		Update("is_read", true).Error
}

func (r *NotificationRepository) CountUnreadNotifications(userID, audience string) (int64, error) {
	var count int64
	// Only badge-true notifications count — ambient events (a wishlist save, a
	// "processing" status) show in the feed but must not inflate the number.
	query := r.db.Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = false AND badge = true", userID)
	if audience != "" {
		query = query.Where("audience = ?", audience)
	}
	err := query.Count(&count).Error
	return count, err
}

func (r *NotificationRepository) DeleteByOrderItemID(orderItemId string) error {
	return r.db.Where("action_url LIKE ?",
		fmt.Sprintf("%%/orders/%s%%", orderItemId)).
		Delete(&domain.Notification{}).Error
}
