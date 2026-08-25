package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func OtpRoutes(router *gin.RouterGroup, otpHandler *controller.OTPController) {
	auth := router.Group("/otp")
	{
		auth.POST("/", middleware.OTPSendRateLimit(), otpHandler.SendOTP)
		auth.GET("/validate", middleware.OTPVerifyRateLimit(), otpHandler.ValideOTP)

	}
}
