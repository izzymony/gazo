package controller_v2

import (
	"fmt"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
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
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")
	categoryId := c.DefaultQuery("category_id", "")
	subCategoryId := c.DefaultQuery("sub_category_id", "")
	context := c.DefaultQuery("context", "")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Println("userIdentifier, isGuest; ", userIdentifier, isGuest)

	resp, total, err := s.service.GetProductsByContext(page, limit, search, categoryId, subCategoryId, context, userIdentifier, isGuest)
	if err != nil {
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
