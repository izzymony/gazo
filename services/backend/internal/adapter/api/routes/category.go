package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func CategoryRoutes(router *gin.RouterGroup, categoryHandler *controller.CategoryController) {
	category := router.Group("/categories")
	{
		// Admin-only: managing the global category taxonomy (B4). Regular users
		// must not create or update categories.
		categoryAdmin := category.Group("")
		categoryAdmin.Use(middleware.AdminAuthMiddleware())
		categoryAdmin.PUT("/update-category/:id", categoryHandler.UpdateCategory)
		categoryAdmin.POST("/create-category", categoryHandler.CreteCategory)
		categoryAdmin.POST("/create-subcategory", categoryHandler.CreteSubCategory)
		categoryAdmin.PUT("/update-subcategory/:id", categoryHandler.UpdateSubCategory)

		// Public reads.
		category.GET("/get-all-categories", categoryHandler.GetAllCategories)
		category.GET("/search", categoryHandler.Search)
		category.GET("/get-category/:id", categoryHandler.FindCategory)
	}
}
