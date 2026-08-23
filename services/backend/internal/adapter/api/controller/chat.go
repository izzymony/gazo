package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"vibaar/backend/internal/adapter/api/requests"
	"vibaar/backend/internal/adapter/api/response"
	"vibaar/backend/internal/core/services"
	"vibaar/backend/internal/helper"
)

type ChatController struct {
	service *services.ChatService
}

func NewChatController(db *gorm.DB) *ChatController {
	return &ChatController{
		service: services.NewChatService(db),
	}
}

func (ctrl *ChatController) SendMessage(c *gin.Context) {
	var body requests.SendMessage
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := ctrl.service.SendMessage(userIdentifier, isGuest, body.ReceiverID, body.Content, body.OrderItemId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (ctrl *ChatController) GetConversationMessages(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := ctrl.service.GetConversationMessages(userIdentifier, isGuest, conversationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response.NewCustomArrayResponse(resp, err))
}

func (ctrl *ChatController) MarkMessageRead(c *gin.Context) {
	conversationID := c.Param("conversation_id")
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err = ctrl.service.MarkMessageRead(userIdentifier, isGuest, conversationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response.NewCustomResponse(nil, err))
}

func (ctrl *ChatController) GetUserConversations(c *gin.Context) {
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := ctrl.service.GetUserConversations(userIdentifier, isGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomArrayResponse(resp, err))
}

func (ctrl *ChatController) GetUnreadMessagesCount(c *gin.Context) {
	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	count, err := ctrl.service.GetUnreadMessagesCount(userIdentifier, isGuest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"unread_count": count})
}
