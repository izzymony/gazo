package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func BusinessRoutes(router *gin.RouterGroup, businessHandler *controller.BusinessController) {
	business := router.Group("/business")
	{
		// Authorized business route
		businessAuth := business.Group("")
		{
			businessAuth.Use(middleware.AuthMiddleware())
			businessAuth.GET("", businessHandler.GetAuthenticatedUserBusiness)
			businessAuth.PUT("/:id", businessHandler.UpdateBusiness)
			businessAuth.POST("", businessHandler.CreateBusiness)
			businessAuth.GET("/metrics/:id", businessHandler.GetBusinessMetric)
			businessAuth.POST("/:id/background/image", businessHandler.UploadBackgroundImage)
			businessAuth.GET("/:id/background", businessHandler.GetBackgroundSettings)
			businessAuth.PUT("/:id/background/color", businessHandler.UpdateBackgroundColor)
			businessAuth.PUT("/:id/shipping", businessHandler.UpdateShippingSettings)
			businessAuth.DELETE("/:id/background/image", businessHandler.DeleteBackgroundImage)
			businessAuth.POST("/add-recently-viewed-businesses", businessHandler.AddRecentlyViewedBusinesses)
			businessAuth.GET("/get-user-recently-viewed-businesses", businessHandler.GetUserRecentlyViewedBusinesses)
			businessAuth.GET("/get-orders", businessHandler.GetOrders)
			businessAuth.GET("/get-order/:id", businessHandler.GetOrder)
			businessAuth.PATCH("/mark-order-ready/:id", businessHandler.MarkOrderReady)
			businessAuth.PATCH("/mark-out-for-delivery/:id", businessHandler.MarkSelfOutForDelivery)
			businessAuth.PATCH("/mark-delivered/:id", businessHandler.MarkSelfDelivered)
			businessAuth.PATCH("/cancel-order/:id", businessHandler.CancelOrder)
			businessAuth.GET("/get-customers", businessHandler.GetCustomers)
			businessAuth.GET("/get-customer-analytics", businessHandler.GetCustomerAnalytics)
			businessAuth.GET("/get-sales-analytics", businessHandler.GetSalesAnalytics)
			businessAuth.GET("/get-product-ranking", businessHandler.GetProductRanking)
			businessAuth.GET("/get-all-products", businessHandler.GetAllProducts)
			businessAuth.GET("/get-followers", businessHandler.GetFollowers)
			businessAuth.GET("/get-store-analytics/:business_id", businessHandler.GetStoreAnalytics)
			businessAuth.GET("/get-dashboard-analytics", businessHandler.GetDashboardAnalytics)
			businessAuth.POST("/create-discount", businessHandler.CreateDiscount)
			businessAuth.GET("/get-discounts", businessHandler.GetDiscounts)
			businessAuth.POST("/add-bank-account", businessHandler.AddBankAccount)
			businessAuth.GET("/get-bank-accounts", businessHandler.GetBankAccounts)
			businessAuth.PATCH("/update-bank-account/:id", businessHandler.UpdateBusinessBankAccount)
			businessAuth.DELETE("/delete-bank-account/:id", businessHandler.DeleteBankAccount)
			businessAuth.GET("/get-product/:id", businessHandler.GetProduct)
		}
		// Unauthorized Business route
		business.GET("/:id", businessHandler.GetBusiness)
	}

	// Separate group for plural businesses endpoint
	businesses := router.Group("/businesses")
	{
		businesses.GET("", businessHandler.GetAllBusiness)
	}

	// Debug/test endpoint for order marking — bypasses auth, so LOCAL ONLY (E0.2).
	// Never register it in staging/production.
	if isLocalEnv() {
		debug := router.Group("/debug")
		{
			debug.PATCH("/mark-order-ready/:id", businessHandler.DebugMarkOrderReady)
		}
	}
}
