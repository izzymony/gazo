package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func WalletRoutes(router *gin.RouterGroup, walletHandler *controller.WalletController) {
	wallet := router.Group("/wallet")
	{
		wallet.Use(middleware.AuthMiddleware())
		wallet.GET("/get-wallet-balances", walletHandler.GetWalletBalances)
		wallet.GET("/get-wallet-transactions", walletHandler.GetWalletTransactions)
		wallet.GET("/get-wallet-transaction/:id", walletHandler.GetWalletTransaction)
		wallet.POST("/withdraw", walletHandler.Withdraw)
	}
}
