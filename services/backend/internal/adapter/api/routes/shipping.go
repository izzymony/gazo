package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func ShippingRoutes(router *gin.RouterGroup, shippingHandler *controller.ShippingController) {
	shipping := router.Group("/shipping")
	{
		shipping.Use(middleware.AuthOrGuestMiddleware())
		shipping.GET("/get-user-shipping-profiles", shippingHandler.GetUserShippingProfile)
		shipping.GET("/get-shipping-profile/:id", shippingHandler.GetShippingProfile)
		shipping.POST("/add-shipping-profile", shippingHandler.AddShippingProfile)
		shipping.PUT("/update-shipping-profile/:id", shippingHandler.UpdateShippingProfile)
		shipping.DELETE("/delete-shipping-profile/:id", shippingHandler.DeleteShippingProfile)
		shipping.PATCH("/set-default-shipping-profile/:id", shippingHandler.SetDefaultShippingProfile)
		shipping.POST("/get-shipping-options", shippingHandler.GetShippingOptions)
	}
}
