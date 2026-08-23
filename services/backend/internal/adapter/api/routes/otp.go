package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func OtpRoutes(router *gin.RouterGroup, otpHandler *controller.OTPController) {
	auth := router.Group("/otp")
	{
		auth.POST("/", middleware.OTPSendRateLimit(), otpHandler.SendOTP)
		auth.GET("/validate", middleware.OTPVerifyRateLimit(), otpHandler.ValideOTP)

	}
}
