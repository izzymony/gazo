package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/middleware"
	"github.com/Tinovalabs/vibaar/services/backend/internal/validators"
)

func ProductRoutes(router *gin.RouterGroup, productHandler *controller.ProductController, ratingHandler *controller.ProductRatingController) {
	product := router.Group("/products")
	{
		productAuth := product.Group("")
		productAuth.Use(middleware.AuthMiddleware())
		{
			productAuth.POST("", validators.ValidateCreateProduct(), productHandler.CreteProduct)
			productAuth.PUT("/:id", validators.ValidateCreateProduct(), productHandler.UpdateProduct)
			productAuth.POST("/add-wishlist/:id", productHandler.AddWishlist)
			productAuth.GET("/get-user-wishlist", productHandler.GetUserWishlists)
			productAuth.DELETE("/delete-wishlist/:id", productHandler.DeleteWishlist)
			productAuth.POST("/add-recently-viewed-products", productHandler.AddRecentlyViewedProducts)

			rating := productAuth.Group("/rating")
			{
				rating.GET("", ratingHandler.GetAllProductRatings)
				rating.PUT("/:id", ratingHandler.UpdateProductRating)
				rating.GET("/:id", ratingHandler.FindProductRating)
				rating.POST("", ratingHandler.CreteProductRating)
			}
		}

		product.GET("/get-top-vendors", productHandler.GetTopVendors)
		product.GET("/:id", productHandler.FindProduct)

		product.GET("", productHandler.GetAllProducts)
	}
}
