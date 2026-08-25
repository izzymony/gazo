package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func TransactionRoutes(routes *gin.RouterGroup, transactionHandler *controller.TransactionController) {
	transactions := routes.Group("/transactions")
	{
		transactions.Use(middleware.AuthOrGuestMiddleware())
		transactions.GET("/get-user-transactions", transactionHandler.GetAllTransactions)
		transactions.GET("/get-user-transaction/:id", transactionHandler.FindTransaction)
		transactions.POST("/initiate", transactionHandler.Initiate)
		transactions.POST("/initiate-checkout", transactionHandler.InitiateCheckout)
		transactions.POST("/verify", transactionHandler.VerifyTransaction)
	}
}
