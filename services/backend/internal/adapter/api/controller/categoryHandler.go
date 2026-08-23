package controller

import (
	"net/http"

	"insta-api/internal/adapter/api/requests"
	"insta-api/internal/adapter/api/response"
	"insta-api/internal/core/services"
	"insta-api/internal/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryController struct {
	service *services.CategoryService
}

func NewCategoryController(db *gorm.DB) *CategoryController {
	return &CategoryController{
		service: services.NewCategoryService(db),
	}
}

func (s *CategoryController) GetAllCategories(c *gin.Context) {
	logger.Info("GetAllCategory")

	resp, err := s.service.GetAllCategories()
	if err != nil {
		logger.Error("Error saving sprint " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomArrayResponse(resp, err))
}

func (s *CategoryController) UpdateCategory(c *gin.Context) {
	logger.Info("GetCategory")

	request := requests.Category{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	params := c.Param("id")

	resp, err := s.service.UpdateCategory(params, request)
	if err != nil {
		logger.Error("Error saving category " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *CategoryController) FindCategory(c *gin.Context) {
	logger.Info("GetCategory")

	id := c.Param("id")

	resp, err := s.service.GetCategoryById(id)
	if err != nil {
		logger.Error("Error " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *CategoryController) CreteCategory(c *gin.Context) {
	logger.Info("CreateCategory")

	request := requests.Category{}

	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := s.service.CreateCategory(request)
	if err != nil {
		logger.Error("error saving category " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *CategoryController) UpdateSubCategory(c *gin.Context) {
	request := requests.SubCategory{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	params := c.Param("id")

	resp, err := s.service.UpdateSubCategory(params, request)
	if err != nil {
		logger.Error("Error " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *CategoryController) CreteSubCategory(c *gin.Context) {
	request := requests.SubCategory{}

	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := s.service.CreateSubCategory(request)
	if err != nil {
		logger.Error("error saving category " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *CategoryController) Search(c *gin.Context) {
	search := c.Query("search")

	resp, err := s.service.SearchCategoriesAndSubCategories(search)
	if err != nil {
		logger.Error("error searching categories and subcategories: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, nil))
}
