package routes

import (
	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/adapter/api/controller"
)

func MockRoutes(router *gin.Engine, mockHandler *controller.MockController) {
	// Mock endpoints simulate external providers (Shipbubble, webhooks) for local
	// testing. Never expose them outside local/dev (E0.2).
	if !isLocalEnv() {
		return
	}
	mock := router.Group("/mock")
	{
		// Direct Shipbubble mock endpoints (baseURL + endpoint) - THESE ARE THE ONES USED!
		mock.POST("/address/validate", mockHandler.MockShippingAddressValidate)
		mock.POST("/fetch_rates", mockHandler.MockShippingFetchRates)      // Fixed: Add direct route
		
		// Shipbubble mock endpoints - match the real API structure
		shipping := mock.Group("/shipping")
		{
			shipping.POST("/address/validate", mockHandler.MockShippingAddressValidate)
			shipping.POST("/fetch_rates", mockHandler.MockShippingFetchRates)
			shipping.POST("/labels", mockHandler.MockShippingCreateShipment)
		}
		
		// Webhook simulation for local testing
		webhook := mock.Group("/webhook")
		{
			webhook.POST("/shipbubble-simulate", mockHandler.MockWebhookSimulator)
		}
	}
}