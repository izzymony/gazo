package routes

import (
	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/adapter/api/controller"
	"vibaar/backend/internal/adapter/api/middleware"
)

func AdminRoutes(router *gin.RouterGroup, adminHandler *controller.AdminController) {
	admin := router.Group("/admin")
	{
		{
			admin.POST("/login", adminHandler.Login)
		}
		admin.Use(middleware.AdminAuthMiddleware())
		admin.GET("/dashboard/stats", adminHandler.GetDashboardStats)
		admin.PATCH("/approve-withdrawal-request/:id", adminHandler.ApproveWithdrawal)
		admin.PATCH("/reject-withdrawal-request/:id", adminHandler.RejectWithdrawal)
		admin.GET("/get-withdrawal-request/:id", adminHandler.GetWithdrawalRequestByID)
		admin.GET("/get-withdrawal-requests", adminHandler.GetAllWithdrawalRequests)
		admin.GET("/get-orders", adminHandler.GetAllOrders)
		admin.GET("/get-all-order-items", adminHandler.GetAllOrderItemsList)
		admin.GET("/get-order-items/:id", adminHandler.GetOrderItems)
		admin.GET("/get-order-item/:id", adminHandler.GetOrderItem)
		admin.GET("/get-products", adminHandler.GetAllProducts)
		admin.GET("/get-product/:id", adminHandler.GetProduct)
		admin.GET("/get-businesses", adminHandler.GetAllBusinesses)
		admin.GET("/get-business/:business_id", adminHandler.GetBusiness)
		admin.GET("/get-users", adminHandler.GetAllUsers)
		admin.GET("/get-user/:user_id", adminHandler.GetUser)
		admin.PATCH("/update-user/:user_id", adminHandler.UpdateUser)
		admin.DELETE("/delete-user/:user_id", adminHandler.DeleteUser)

		admin.GET("/get-wallet-balances/:business_id", adminHandler.GetWalletBalances)
		admin.GET("/get-wallet-transactions/:business_id", adminHandler.GetWalletTransactions)
		admin.GET("/get-wallet-transaction/:id", adminHandler.GetWalletTransaction)

		admin.PATCH("/kyc/:id/review", adminHandler.ReviewKYC)
		admin.GET("/kyc", adminHandler.GetAllKYC)

		// Admin Shipping Routes - Safe admin-only endpoints under /api/v1/admin/*
		admin.GET("/get-shipments", adminHandler.GetAllShipments)
		admin.GET("/get-shipment/:id", adminHandler.GetShipment)
		admin.PATCH("/update-shipping-status/:order_item_id", adminHandler.UpdateShippingStatus)

		// Order management
		admin.DELETE("/delete-order-item/:id", adminHandler.DeleteOrderItem)
		admin.DELETE("/delete-order/:id", adminHandler.DeleteOrder)

	}
}
