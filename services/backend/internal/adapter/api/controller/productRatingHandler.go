package controller

import (
	"fmt"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProductRatingController struct {
	service *services.ProductRatingService
}

func NewProductRatingController(db *gorm.DB) *ProductRatingController {
	return &ProductRatingController{
		service: services.NewProductRatingService(db),
	}
}

func (s *ProductRatingController) GetAllProductRatings(c *gin.Context) {
	logger.Info("GetAllProductRating")

	params := FlatUrlQuery(c.Request.URL.Query())

	resp, err := s.service.GetAll(params)
	if err != nil {
		logger.Error("Error getting all product rating" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomArrayResponse(resp, err))
}

func (s *ProductRatingController) UpdateProductRating(c *gin.Context) {
	logger.Info("GetProductRating")

	request := requests.ProductRating{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	params := c.Param("id")

	category := domain.ProductRating{}
	helper.Copy(request, &category)

	resp, err := s.service.Update(params, category)
	if err != nil {
		logger.Error("Error updatig product rating" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ProductRatingController) FindProductRating(c *gin.Context) {
	logger.Info("GetProductRating")

	id := c.Param("id")

	resp, err := s.service.Find(id)
	if err != nil {
		logger.Error("Error finding product rating" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ProductRatingController) CreteProductRating(c *gin.Context) {
	logger.Info("CreateProductRating")

	request := map[string]interface{}{}

	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	category := domain.ProductRating{}
	err = helper.Copy(request, &category)
	if err != nil {
		fmt.Println("ere")

	}

	resp, err := s.service.Save(category)
	if err != nil {
		logger.Error("error creating product rating" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
