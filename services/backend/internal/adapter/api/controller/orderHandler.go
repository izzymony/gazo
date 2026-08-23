package controller

import (
	"math"
	"net/http"
	"strconv"

	"insta-api/internal/adapter/api/requests"
	"insta-api/internal/adapter/api/response"
	"insta-api/internal/core/services"
	"insta-api/internal/helper"
	"insta-api/internal/logger"
	validators "insta-api/internal/validator"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OrderController struct {
	service *services.OrderService
}

func NewOrderController(db *gorm.DB) *OrderController {
	return &OrderController{
		service: services.NewOrderService(db),
	}
}

func (o *OrderController) GetUserOrders(c *gin.Context) {
	logger.Info("GetAllOrder")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := o.service.GetUserOrders(userIdentifier, isGuest, page, limit)
	if err != nil {
		logger.Error("Error saving sprint " + err.Error())
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

func (o *OrderController) UpdateOrder(c *gin.Context) {
	logger.Info("GetOrder")

	request := requests.Order{}
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
	resp, err := o.service.UpdateOrder(id, request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error update order " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (o *OrderController) FindOrder(c *gin.Context) {
	logger.Info("FindOrder")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := o.service.FindOrderItem(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// FindOrderPublic - Public endpoint for payment success page (no auth required)
func (o *OrderController) FindOrderPublic(c *gin.Context) {
	logger.Info("FindOrderPublic")
	id := c.Param("id")
	
	// For public access, we only allow fetching orders by invoice reference
	// This provides security since invoice references are hard to guess
	resp, err := o.service.FindOrderByInvoice(id)
	if err != nil {
		logger.Error("error fetching order publicly: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Only return order if it exists and is a valid order (for security)
	// Allow pending orders since payment redirect might happen before final status update
	if resp.Status == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	
	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (o *OrderController) CreteOrder(c *gin.Context) {
	logger.Info("CreateOrder")

	request := requests.Order{}
	err := c.Bind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	validation, err := validators.IsInputValid(request)
	if err != nil {
		mp := validation.(map[string]interface{})
		c.JSON(http.StatusInternalServerError, mp)
		return
	}

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := o.service.Create(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error creating order " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (o *OrderController) DeleteOrder(c *gin.Context) {
	logger.Info("DeleteOrder")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	err = o.service.DeleteOrder(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error deleting order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}
