package routes

import (
	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/controller"
	"insta-api/internal/adapter/api/middleware"
)

func CollectionRoutes(router *gin.RouterGroup, collectionHandler *controller.CollectionController) {
	collection := router.Group("/collections")
	{
		collection.Use(middleware.AuthMiddleware())
		collection.GET("get-collections/:business_id", collectionHandler.GetAllCollections)
		collection.GET("get-collection/:id", collectionHandler.GetCollection)
		collection.POST("create-collection", collectionHandler.CreateCollection)
		collection.PUT("update-collection/:id", collectionHandler.UpdateCollection)
		collection.DELETE("delete-collection/:id", collectionHandler.DeleteCollection)
	}
}
