package controller

import (
	"fmt"
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

type ShippingController struct {
	service *services.ShippingService
}

func NewShippingController(db *gorm.DB) *ShippingController {
	return &ShippingController{
		service: services.NewShippingService(db),
	}
}

func (s *ShippingController) GetUserShippingProfile(c *gin.Context) {
	logger.Info("GetUserShippingProfile")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetAllShippingProfile(userIdentifier, isGuest, page, limit)
	if err != nil {
		logger.Error("Error fetching shipping addresses: " + err.Error())
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

func (s *ShippingController) SetDefaultShippingProfile(c *gin.Context) {
	logger.Info("SetDefaultShippingProfile")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.SetDefaultShippingProfile(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error saving shipping address " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ShippingController) GetShippingOptions(c *gin.Context) {
	logger.Info("GetShippingOptions")
	fmt.Printf("🔥 DEBUG: GetShippingOptions called\n")

	request := requests.ShippingOptionRequest{}
	err := c.ShouldBind(&request)
	fmt.Printf("🔥 DEBUG: Request bound: %+v, Error: %v\n", request, err)
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

	resp, err := s.service.GetShippingOptions(request, userIdentifier, isGuest)
	fmt.Printf("🔥 DEBUG: Service returned - resp length: %d, error: %v\n", len(resp), err)
	if err != nil {
		logger.Error("error getting shipping options " + err.Error())
		fmt.Printf("🔥 DEBUG: Error occurred: %s\n", err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	logger.Info("🚀 DEBUG: Shipping options response data:")
	logger.Info(fmt.Sprintf("🚀 DEBUG: Response length: %d", len(resp)))
	for i, option := range resp {
		logger.Info(fmt.Sprintf("🚀 DEBUG: Option %d - ID: %s, DeliveryType: %s, Price: %s, Description: %s", 
			i, option.ID, option.DeliveryType, option.Price, option.Description))
		fmt.Printf("🔥 DEBUG: Option %d - ID: %s, DeliveryType: %s, Price: %s\n", 
			i, option.ID, option.DeliveryType, option.Price)
	}

	fmt.Printf("🔥 DEBUG: About to return response with %d options\n", len(resp))
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    resp,
	})
}

func (s *ShippingController) UpdateShippingProfile(c *gin.Context) {
	logger.Info("UpdateShippingProfile")

	request := requests.ShippingProfile{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := s.service.UpdateShippingProfile(id, request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error saving shipping address " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ShippingController) DeleteShippingProfile(c *gin.Context) {
	logger.Info("DeleteShippingProfile")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err = s.service.DeleteShippingProfile(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error deleting shipping address " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}

func (s *ShippingController) GetShippingProfile(c *gin.Context) {
	logger.Info("GetShippingProfile")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.GetShippingProfile(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error adding shipping info" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ShippingController) AddShippingProfile(c *gin.Context) {
	logger.Info("AddShippingProfile")

	request := requests.ShippingProfile{}

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

	resp, err := s.service.AddShippingProfile(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error adding shipping info" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
