package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
)

func WebhookRoutes(router *gin.RouterGroup, webhookHandler *controller.WebhookController) {
	webhook := router.Group("/webhook")
	{
		webhook.POST("/paystack", webhookHandler.PaystackWebhook)
		webhook.POST("/shipbubble", webhookHandler.ShipbubbleWebhook)
		webhook.POST("/twilio-message-status", webhookHandler.TwilioMessageStatus)
	}
}
