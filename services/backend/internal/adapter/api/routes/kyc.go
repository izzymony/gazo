package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func KYCRoutes(router *gin.RouterGroup, controller *controller.KYCController) {
	kyc := router.Group("/kyc")
	{
		kyc.Use(middleware.AuthMiddleware())
		kyc.POST("/submit", controller.SubmitKYC)
		kyc.GET("/status", controller.GetKYCStatus)
	}
}
