package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func LogRoutes(router *gin.RouterGroup, logHandler *controller.LogController) {
	log := router.Group("/logs")
	log.Use(middleware.AdminAuthMiddleware())
	{
		log.GET("/logs", logHandler.TailLogHandler)
	}
}
