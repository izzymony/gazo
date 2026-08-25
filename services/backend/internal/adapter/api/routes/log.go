package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func LogRoutes(router *gin.RouterGroup, logHandler *controller.LogController) {
	log := router.Group("/logs")
	log.Use(middleware.AdminAuthMiddleware())
	{
		log.GET("/logs", logHandler.TailLogHandler)
	}
}
