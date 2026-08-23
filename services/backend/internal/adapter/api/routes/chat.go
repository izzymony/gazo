package routes

import (
	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/adapter/api/controller"
	"vibaar/backend/internal/adapter/api/middleware"
)

func ChatRoutes(router *gin.RouterGroup, controller *controller.ChatController) {
	r := router.Group("/chat")
	{
		r.Use(middleware.AuthMiddleware())
		r.POST("/send-message", controller.SendMessage)
		r.GET("/get-conversation-messages/:conversation_id", controller.GetConversationMessages)
		r.PATCH("/mark-message-read/:conversation_id", controller.MarkMessageRead)
		r.GET("/get-user-conversations", controller.GetUserConversations)
		r.GET("/unread-count", controller.GetUnreadMessagesCount)
	}
}
