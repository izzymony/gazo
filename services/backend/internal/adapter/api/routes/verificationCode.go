package routes

import (
	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/adapter/api/controller"
	"vibaar/backend/internal/adapter/api/middleware"
)

func VerificationCodeRoutes(router *gin.RouterGroup, handler *controller.VerificationCodeController) {
	r := router.Group("/verification-code")
	{
		{
			r.POST("/send-register-otp", middleware.OTPSendRateLimit(), handler.SendRegisterOTP)
			r.POST("/validate-code", middleware.OTPVerifyRateLimit(), handler.ValidateCode)
		}
		r.Use(middleware.AuthMiddleware())
		r.POST("/send-withdrawal-request-otp", middleware.OTPSendRateLimit(), handler.SendWithdrawalRequestOTP)
	}
}
