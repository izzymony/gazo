package routes

import (
	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/adapter/api/controller"
	"vibaar/backend/internal/adapter/api/middleware"
)

func NotificationRoutes(router *gin.RouterGroup, controller *controller.NotificationController) {
	r := router.Group("/notification")
	{
		r.Use(middleware.AuthMiddleware())
		r.GET("/get-notifications", controller.GetNotifications)
		r.PATCH("/mark-notification-read/:id", controller.MarkRead)
		r.GET("/unread-summary", controller.GetUnreadSummary)

	}
}
