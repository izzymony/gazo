package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func OrderRoutes(router *gin.RouterGroup, orderHandler *controller.OrderController) {
	order := router.Group("/orders")
	{
		// Public endpoint for payment success page - no auth required
		order.GET("/public/get-order/:id", orderHandler.FindOrderPublic)
		
		// Protected endpoints requiring authentication
		order.Use(middleware.AuthOrGuestMiddleware())
		order.GET("/get-user-orders", orderHandler.GetUserOrders)
		order.PUT("/update-order/:id", orderHandler.UpdateOrder)
		order.GET("/get-order/:id", orderHandler.FindOrder)
		order.POST("/create-order", orderHandler.CreteOrder)
		order.DELETE("/delete-order/:id", orderHandler.DeleteOrder)
	}
}
