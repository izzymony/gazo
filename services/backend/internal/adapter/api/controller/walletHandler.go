package controller

import (
	"errors"
	"math"
	"net/http"
	"strconv"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

	c.JSON(http.StatusOK, walletBalancesResponse(wallet))
}

// walletBalancesResponse builds the balances payload.
//
// Extracted from the handler so it can be tested without a router or a
// database: the interesting part is not the HTTP plumbing, it is that
// release_delay_hours reports the SAME policy the release cron enforces.
//
// That field exists so the seller-facing copy does not hardcode "24 hours".
// This project already has one constant duplicated across five places
// (KYC_WITHDRAWAL_GATE_NGN — the crons, the web pre-check and the notification
// copy each carry their own literal, so changing the env var desynchronises
// enforcement from every message about it). Shipping a second copy of
// EARNINGS_RELEASE_DELAY_HOURS into the web bundle would repeat that exactly,
// and the failure is silent: the policy changes, the screen keeps promising the
// old one.
func walletBalancesResponse(wallet *domain.Wallet) gin.H {
	return gin.H{
		"available_balance":  wallet.AvailableBalance,
		"clearing_balance":   wallet.ClearingBalance,
		"orders_in_progress": wallet.OrdersInProgress,
		"total_earnings":     wallet.TotalEarnings,
		"total_withdrawn":    wallet.TotalWithdrawn,
		// D1: hours after a CONFIRMED DELIVERY before earnings become available
		// for payout. Read from the same helper the cron reads, so the number on
		// the screen cannot drift from the number that moves the money.
		"release_delay_hours": helper.EarningsReleaseDelay().Hours(),
	}
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
		// KYC1: surface a stable code so the web can show the verify modal
		// without string-matching the message.
		var coded *helper.CodedError
		if errors.As(err, &coded) {
			c.JSON(http.StatusForbidden, gin.H{"error": coded.Message, "error_code": coded.Code})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
