package services

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type NotificationService struct {
	notificationRepo ports.NotificationInterface
	chatRepo         ports.ChatInterface
	userRepo         ports.UserRepoInterface
	businessRepo     ports.BusinessIface
	orderRepo        ports.OrderRepoInterface
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{
		notificationRepo: mysql_repo.NewNotificationRepository(db),
		chatRepo:         mysql_repo.NewChatRepository(db),
		businessRepo:     mysql_repo.NewBusinessRepository(db),
		userRepo:         mysql_repo.NewUserRepository(db),
		orderRepo:        mysql_repo.NewOrderRepository(db),
	}
}

func (s *NotificationService) CreateNotification(data *domain.Notification) error {
	return s.notificationRepo.Create(data)
}

func (s *NotificationService) GetUserNotifications(userId, notificationType, audience string, page, limit int) ([]domain.Notification, int64, error) {
	return s.notificationRepo.FindByUser(userId, notificationType, audience, page, limit)
}

func (s *NotificationService) MarkNotificationRead(userId, notificationId string) error {
	return s.notificationRepo.MarkAsRead(userId, notificationId)
}

func (s *NotificationService) GetUnreadSummary(userID string, isGuest bool, audience string) (int64, int64, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": userID}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, 0, fmt.Errorf("something went wrong")
	}
	if user == nil && !isGuest {
		return 0, 0, fmt.Errorf("invalid user/guest")
	}

	unreadMessages, err := s.chatRepo.CountUnreadMessages(userID)
	if err != nil {
		return 0, 0, fmt.Errorf("error getting unread messages: %w", err)
	}

	unreadNotifications, err := s.notificationRepo.CountUnreadNotifications(userID, audience)
	if err != nil {
		return 0, 0, fmt.Errorf("error getting unread notifications: %w", err)
	}

	return unreadMessages, unreadNotifications, nil
}
