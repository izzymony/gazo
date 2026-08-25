package routes_v2

import (
	"github.com/gin-gonic/gin"
	v2Controller "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller/v2"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
)

func ProductRoutes(router *gin.RouterGroup, productHandler *v2Controller.ProductController) {
	product := router.Group("/products")
	{
		productAuth := product.Group("")
		productAuth.Use(middleware.AuthMiddleware())
		productAuth.GET("", productHandler.GetAllProducts)
	}
}
