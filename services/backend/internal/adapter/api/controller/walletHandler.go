package controller

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
)

type WalletController struct {
	service *services.WalletService
}

func NewWalletController(db *gorm.DB) *WalletController {
	return &WalletController{
		service: services.NewWalletService(db),
	}
}

func (s *WalletController) GetWalletBalances(c *gin.Context) {
	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	wallet, err := s.service.GetWalletBalances(userIdentifier)
	if err != nil {
		logger.Error("Error fetching wallet: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"available_balance":  wallet.AvailableBalance,
		"clearing_balance":   wallet.ClearingBalance,
		"orders_in_progress": wallet.OrdersInProgress,
		"total_earnings":     wallet.TotalEarnings,
		"total_withdrawn":    wallet.TotalWithdrawn,
	})
}

func (s *WalletController) GetWalletTransactions(c *gin.Context) {
	logger.Info("GetWalletTransactions")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	transactionType := c.DefaultQuery("transaction_type", "")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetWalletTransactions(userIdentifier, transactionType, page, limit)
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

func (s *WalletController) GetWalletTransaction(c *gin.Context) {
	logger.Info("GetWalletTransaction")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.GetWalletTransaction(id, userIdentifier)
	if err != nil {
		logger.Error("Error saving transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *WalletController) Withdraw(c *gin.Context) {
	var req requests.WithdrawalRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.RequestWithdrawal(userIdentifier, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
