package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

type NotificationController struct {
	service *services.NotificationService
}

func NewNotificationController(db *gorm.DB) *NotificationController {
	return &NotificationController{
		service: services.NewNotificationService(db),
	}
}

func (c *NotificationController) GetNotifications(ctx *gin.Context) {
	userId, _, err := helper.GetUserIdentifier(ctx)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(ctx.DefaultQuery("limit", "20"))
	notificationType := ctx.Query("type")
	audience := ctx.Query("audience")

	notifications, total, err := c.service.GetUserNotifications(userId, notificationType, audience, page, limit)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch notifications"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"page":          page,
		"limit":         limit,
		"total":         total,
	})
}

func (c *NotificationController) MarkRead(ctx *gin.Context) {
	userId, _, err := helper.GetUserIdentifier(ctx)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	notificationId := ctx.Param("id")

	err = c.service.MarkNotificationRead(userId, notificationId)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "could not mark as read"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"status": "marked as read"})
}

func (c *NotificationController) GetUnreadSummary(ctx *gin.Context) {
	userID, isGuest, err := helper.GetUserIdentifier(ctx)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	unreadMessages, unreadNotifications, err := c.service.GetUnreadSummary(userID, isGuest, ctx.Query("audience"))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"unread_messages":      unreadMessages,
		"unread_notifications": unreadNotifications,
	})
}
