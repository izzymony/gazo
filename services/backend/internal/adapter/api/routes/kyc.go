package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func KYCRoutes(router *gin.RouterGroup, controller *controller.KYCController) {
	kyc := router.Group("/kyc")
	{
		kyc.Use(middleware.AuthMiddleware())
		kyc.POST("/submit", controller.SubmitKYC)
		kyc.GET("/status", controller.GetKYCStatus)
	}
}
