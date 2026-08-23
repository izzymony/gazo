package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
)

// WhatsAppWebhookRoutes registers WhatsApp webhook endpoints
func WhatsAppWebhookRoutes(router *gin.RouterGroup, handler *controller.WhatsAppWebhookController) {
	webhooks := router.Group("/webhooks")
	{
		// Meta WhatsApp Cloud API webhook verification (GET)
		webhooks.GET("/whatsapp", handler.VerifyWebhook)

		// Meta WhatsApp Cloud API status updates (POST)
		webhooks.POST("/whatsapp", handler.HandleStatusUpdate)

		// Twilio status callback endpoint
		webhooks.POST("/twilio/status", handler.TwilioStatusCallback)
	}
}
