package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"insta-api/internal/adapter/api/requests"
	"insta-api/internal/core/services"
	"insta-api/internal/logger"
)

type BankController struct {
	service *services.BankService
}

func NewBankController() *BankController {
	return &BankController{
		service: services.NewBankService(),
	}
}

func (b *BankController) GetBanks(c *gin.Context) {
	logger.Info("GetBanks")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	banks, totalPages, err := b.service.GetBanks(page, limit)
	if err != nil {
		logger.Error("Error fetching banks: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       banks,
		"page":       page,
		"limit":      limit,
		"totalPages": totalPages,
	})
}

func (b *BankController) SearchBank(c *gin.Context) {
	logger.Info("SearchBank")

	query := c.Query("query")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	results, totalPages, err := b.service.SearchBank(query, page, limit)
	if err != nil {
		logger.Error("Error searching bank: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       results,
		"page":       page,
		"limit":      limit,
		"totalPages": totalPages,
	})
}

func (b *BankController) ValidateBankAccount(c *gin.Context) {
	logger.Info("ValidateBankAccount")

	var req requests.BankRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	accountDetails, err := b.service.ValidateBankAccount(req.AccountNumber, req.BankCode)
	if err != nil {
		logger.Error("Error validating bank account: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
		"data":    accountDetails,
	})

}
