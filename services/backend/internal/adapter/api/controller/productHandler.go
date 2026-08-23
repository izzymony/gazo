package controller

import (
	"math"
	"net/http"
	"strconv"

	"vibaar/backend/internal/adapter/api/requests"
	"vibaar/backend/internal/adapter/api/response"
	"vibaar/backend/internal/core/services"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductController struct {
	service *services.ProductService
}

func NewProductController(db *gorm.DB) *ProductController {
	return &ProductController{
		service: services.NewProductService(db),
	}
}

func (s *ProductController) GetAllProducts(c *gin.Context) {
	logger.Info("GetAllProduct")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")
	categoryId := c.DefaultQuery("category_id", "")
	subCategoryId := c.DefaultQuery("sub_category_id", "")
	resp, total, err := s.service.GetAllProductsOrderedByOrders(page, limit, search, categoryId, subCategoryId)
	if err != nil {
		logger.Error("Error fetching business " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       response.NewCustomArrayResponse(resp, err),
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (s *ProductController) GetTopVendors(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	vendors, total, err := s.service.GetTopVendors(page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       vendors,
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (s *ProductController) UpdateProduct(c *gin.Context) {
	logger.Info("GetProduct")

	value, exists := c.Get("validatedProduct")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "validated data missing"})
		return
	}

	request := value.(requests.Product)

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := s.service.UpdateProduct(id, userIdentifier, request)
	if err != nil {
		logger.Error("Error saving sprint " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ProductController) FindProduct(c *gin.Context) {
	logger.Info("GetProduct")

	id := c.Param("id")

	product, err := s.service.Find(id)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate combinations on-demand if product has variants
	// This replaces the need for pre-stored combinations
	var combinations []map[string]interface{}
	if product != nil && len(product.Variants) > 0 {
		combinations = s.service.CalculateCombinations(product)
	}

	// Return product with calculated combinations
	resp := map[string]interface{}{
		"product":      product,
		"combinations": combinations,
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ProductController) CreteProduct(c *gin.Context) {
	logger.Info("CreateProduct")

	value, exists := c.Get("validatedProduct")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "validated data missing"})
		return
	}
	request := value.(requests.Product)

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := s.service.CreateProduct(request, userIdentifier)
	if err != nil {
		logger.Error("error saving product" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ProductController) AddWishlist(c *gin.Context) {
	logger.Info("AddWishlist")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.AddWishlist(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error adding product wishlist" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ProductController) DeleteWishlist(c *gin.Context) {
	logger.Info("DeleteWishlist")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = s.service.DeleteWishlist(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error deleting product wishlist" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}

func (s *ProductController) GetUserWishlists(c *gin.Context) {
	logger.Info("GetUserWishlists")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetUserWishlists(userIdentifier, isGuest, page, limit)
	if err != nil {
		logger.Error("error fetching user wishlist" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       response.NewCustomArrayResponse(resp, err),
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (s *ProductController) AddRecentlyViewedProducts(c *gin.Context) {
	logger.Info("AddRecentlyViewedProducts")

	request := requests.RecentlyViewedProduct{}

	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = s.service.AddRecentlyViewedProducts(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}
