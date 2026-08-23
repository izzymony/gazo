package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func BankRoutes(router *gin.RouterGroup, bankHandler *controller.BankController) {
	bank := router.Group("/bank")
	{
		bank.Use(middleware.AuthMiddleware())
		bank.GET("/get-banks", bankHandler.GetBanks)
		bank.GET("/search-bank", bankHandler.SearchBank)
		bank.POST("/validate-bank-account", bankHandler.ValidateBankAccount)
	}
}
