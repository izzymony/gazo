package controller

import (
	"fmt"
	"math"
	"net/http"
	"strconv"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"

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
		respondError(c, http.StatusBadRequest, "error_fetching_shipping_addresses", "", err)
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
		respondError(c, http.StatusBadRequest, "set_default_shipping_profile", "", err)
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *ShippingController) GetShippingOptions(c *gin.Context) {
	logger.Info("GetShippingOptions")

	request := requests.ShippingOptionRequest{}
	err := c.ShouldBind(&request)
	// Was `%+v` of the whole bound request: the buyer's street, town, state,
	// country AND the nested shipping_user (name, email, phone).
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
	if err != nil {
		respondError(c, http.StatusBadRequest, "get_shipping_options", "", err)
		return
	}

	// Was a per-option dump of id, courier name, price and description, to
	// both the logger AND stdout. The count is the only part that says
	// anything about the outcome.
	logger.Info(fmt.Sprintf("shipping options returned count=%d", len(resp)))

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
		respondError(c, http.StatusBadRequest, "update_shipping_profile", "", err)
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
		respondError(c, http.StatusBadRequest, "error_deleting_shipping_address", "", err)
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
		respondError(c, http.StatusBadRequest, "get_shipping_profile", id, err)
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
		// The path that was verified leaking on staging: a driver error reached
		// here, was concatenated into a log line AND returned in the body.
		respondError(c, http.StatusBadRequest, "add_shipping_profile", "", err)
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
