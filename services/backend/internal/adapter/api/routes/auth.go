package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func AuthRoutes(router *gin.RouterGroup, authHandler *controller.AuthController, otpHandler *controller.OTPController) {
	auth := router.Group("")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh-token", authHandler.RefreshToken)
		auth.POST("/validate-email-or-phone", authHandler.CheckEmailOrPhoneExists)

		auth.POST("/forgot-password", authHandler.ForgetPassword)
		auth.POST("/send-otp", middleware.OTPSendRateLimit(), otpHandler.SendOTP)

		auth.GET("/auth/:provider", authHandler.InitiateSocialAuth)
		auth.POST("/auth/callback", authHandler.SocialAuthCallback)
	}
}
