package routes

import (
	"github.com/gin-gonic/gin"
	"vibaar/backend/internal/adapter/api/controller"
	"vibaar/backend/internal/adapter/api/middleware"
)

func ReferralRoutes(router *gin.RouterGroup, referralHandler *controller.ReferralController) {
	referral := router.Group("/referral")
	{
		// Public endpoint for validating referral codes (before login)
		referral.POST("/validate", referralHandler.ValidateReferral)

		// Protected endpoints - require authentication
		referral.Use(middleware.AuthMiddleware())
		referral.GET("/info", referralHandler.GetReferralInfo)
		referral.POST("/set-referrer", referralHandler.SetReferrer)
		referral.POST("/withdraw", referralHandler.WithdrawCredit)
		referral.GET("/history", referralHandler.GetCreditHistory)
		referral.GET("/referees", referralHandler.GetReferees)
		referral.GET("/balance", referralHandler.GetTotalCredit)
	}

	// Rewards alias routes - future-proof naming (rewards = umbrella term for credits)
	rewards := router.Group("/rewards")
	{
		rewards.Use(middleware.AuthMiddleware())
		rewards.GET("/info", referralHandler.GetReferralInfo)
	}
}

func AdminReferralRoutes(router *gin.RouterGroup, adminReferralHandler *controller.AdminReferralController) {
	// Admin referral routes are under the admin group with admin auth
	referral := router.Group("/referral")
	{
		referral.Use(middleware.AdminAuthMiddleware())
		referral.GET("/stats", adminReferralHandler.GetReferralStats)
		referral.GET("/users", adminReferralHandler.GetUsersWithReferralData)
		referral.GET("/users/:id/credits", adminReferralHandler.GetUserCreditDetails)
		referral.GET("/users/:id/info", adminReferralHandler.GetUserReferralInfo)
		referral.POST("/credit/adjust", adminReferralHandler.ManualCreditAdjustment)
	}
}
