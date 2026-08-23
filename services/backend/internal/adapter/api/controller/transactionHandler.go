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

type TransactionController struct {
	service *services.TransactionService
}

func NewTransactionController(db *gorm.DB) *TransactionController {
	return &TransactionController{
		service: services.NewTransactionService(db),
	}
}

func (s *TransactionController) GetAllTransactions(c *gin.Context) {
	logger.Info("GetAllTransaction")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetAll(userIdentifier, isGuest, page, limit)
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

func (s *TransactionController) FindTransaction(c *gin.Context) {
	logger.Info("GetTransaction")

	id := c.Param("id")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.FetchOne(id, userIdentifier, isGuest)
	if err != nil {
		logger.Error("Error saving transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *TransactionController) Initiate(c *gin.Context) {
	logger.Info("Initiate transaction")

	request := requests.InitiateTransaction{}

	err := c.Bind(&request)
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

	resp, err := s.service.Initiate(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error initiating transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    resp,
	})
}

func (s *TransactionController) InitiateCheckout(c *gin.Context) {
	logger.Info("InitiateCheckout")

	request := requests.InitiateCheckout{}
	if err := c.Bind(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.InitiateCheckout(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error initiating checkout: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    resp,
	})
}

func (s *TransactionController) VerifyTransaction(c *gin.Context) {
	logger.Info("VerifyTransaction transaction")

	request := requests.VerifyTransaction{}

	err := c.Bind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	_, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.Verify(request, isGuest)
	if err != nil {
		logger.Error("error verifying transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    resp,
	})
}
