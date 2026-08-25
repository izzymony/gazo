package ports

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type NotificationInterface interface {
	Create(notification *domain.Notification) error
	FindByUser(userId, notificationType, audience string, page, limit int) ([]domain.Notification, int64, error)
	MarkAsRead(userId string, notificationId string) error
	CountUnreadNotifications(userID, audience string) (int64, error)
	DeleteByOrderItemID(orderItemId string) error
}
