package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"

	"insta-api/internal/adapter/api/middleware"
)

func UserRoutes(router *gin.RouterGroup, userHandler *controller.UserController, authHandler *controller.AuthController) {
	users := router.Group("/users")
	{
		// Admin-only: the full user list is PII and must not be enumerable by
		// regular authenticated users (B4).
		usersAdmin := users.Group("")
		usersAdmin.Use(middleware.AdminAuthMiddleware())
		usersAdmin.GET("", userHandler.GetAllUsers)

		// Self-scoped user endpoints (regular auth).
		usersAuth := users.Group("")
		usersAuth.Use(middleware.AuthMiddleware())
		usersAuth.PUT("/update-user", userHandler.UpdateUser)
		usersAuth.GET("/get-user-profile", userHandler.GetUserProfile)
		usersAuth.GET("/me", userHandler.GetMe)
		usersAuth.PUT("/recommendations/:id", authHandler.UpdateRecommendations)
		usersAuth.PUT("/change-password", authHandler.ChangePassword)
		usersAuth.PATCH("/follow-business/:business-id", userHandler.FollowBusiness)
		usersAuth.PATCH("/unfollow-business/:business-id", userHandler.UnFollowBusiness)
		usersAuth.GET("/get-following", userHandler.GetFollowing)
	}
}
