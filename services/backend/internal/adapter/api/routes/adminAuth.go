package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func AdminAuthRoutes(router *gin.RouterGroup, adminAuthHandler *controller.AdminAuthController) {
	adminAuth := router.Group("/admin/auth")
	{
		// Public routes (no authentication required)
		adminAuth.POST("/login", adminAuthHandler.AdminLogin)
		
		// Protected routes (authentication required)
		protected := adminAuth.Group("")
		protected.Use(middleware.AdminAuthMiddleware())
		{
			protected.POST("/logout", adminAuthHandler.AdminLogout)
			protected.POST("/refresh", adminAuthHandler.RefreshToken)
			protected.POST("/change-password", adminAuthHandler.ChangePassword)
		}
	}

	// Admin profile routes
	adminProfile := router.Group("/admin")
	adminProfile.Use(middleware.AdminAuthMiddleware())
	{
		adminProfile.GET("/profile", adminAuthHandler.GetProfile)
		adminProfile.PATCH("/profile", adminAuthHandler.UpdateProfile)
		adminProfile.GET("/audit-logs", adminAuthHandler.GetAuditLogs)
	}
}