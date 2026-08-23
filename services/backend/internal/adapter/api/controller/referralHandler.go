package controller

import (
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

type ReferralController struct {
	service *services.ReferralService
}

func NewReferralController(db *gorm.DB) *ReferralController {
	return &ReferralController{
		service: services.NewReferralService(db),
	}
}

// GetReferralInfo returns the user's referral information
// GET /referral/info
func (r *ReferralController) GetReferralInfo(c *gin.Context) {
	logger.Info("GetReferralInfo")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if isGuest {
		c.JSON(http.StatusBadRequest, gin.H{"error": "guests cannot access referral program"})
		return
	}

	info, err := r.service.GetReferralInfo(userIdentifier)
	if err != nil {
		logger.Error("Error getting referral info: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(info, nil))
}

// ValidateReferral validates a referral username
// POST /referral/validate
func (r *ReferralController) ValidateReferral(c *gin.Context) {
	logger.Info("ValidateReferral")

	var req requests.ValidateReferralRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Get user ID if authenticated (for self-check)
	userID := ""
	if userIdentifier, isGuest, err := helper.GetUserIdentifier(c); err == nil && !isGuest {
		userID = userIdentifier
	}

	valid, referrer, err := r.service.ValidateReferralUsername(req.ReferralUsername, userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "validation failed",
			"data": gin.H{
				"valid": false,
				"error": err.Error(),
			},
		})
		return
	}

	referrerName := ""
	referrerUsername := ""
	if referrer != nil {
		referrerName = referrer.Firstname
		if referrer.Lastname != "" {
			referrerName += " " + string(referrer.Lastname[0]) + "."
		}
		referrerUsername = "@" + referrer.UserName
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"data": gin.H{
			"valid":             valid,
			"referrer_name":     referrerName,
			"referrer_username": referrerUsername,
		},
	})
}

// SetReferrer stores the referral code during profile completion
// POST /referral/set-referrer
func (r *ReferralController) SetReferrer(c *gin.Context) {
	logger.Info("SetReferrer")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if isGuest {
		c.JSON(http.StatusBadRequest, gin.H{"error": "guests cannot use referral codes"})
		return
	}

	var req requests.SetReferrerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// Validate first
	valid, referrer, err := r.service.ValidateReferralUsername(req.ReferralUsername, userIdentifier)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !valid || referrer == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid referral username"})
		return
	}

	// Set the referrer
	if err := r.service.SetReferrer(userIdentifier, req.ReferralUsername); err != nil {
		logger.Error("Error setting referrer: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	referrerName := referrer.Firstname
	if referrer.Lastname != "" {
		referrerName += " " + string(referrer.Lastname[0]) + "."
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Referral code saved! You'll both earn rewards when you complete your first order.",
		"data": gin.H{
			"referred_by":              "@" + referrer.UserName,
			"referrer_name":            referrerName,
			"pending_reward":           1000.0,
			"activation_requirement":   "Complete your first order to activate rewards",
		},
	})
}

// WithdrawCredit withdraws available credit to wallet
// POST /referral/withdraw
func (r *ReferralController) WithdrawCredit(c *gin.Context) {
	logger.Info("WithdrawCredit")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if isGuest {
		c.JSON(http.StatusBadRequest, gin.H{"error": "guests cannot withdraw credit"})
		return
	}

	var req requests.WithdrawCreditRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := r.service.Withdraw(userIdentifier, req.Amount); err != nil {
		logger.Error("Error withdrawing credit: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get updated info
	info, _ := r.service.GetReferralInfo(userIdentifier)

	c.JSON(http.StatusOK, gin.H{
		"message": "₦" + strconv.FormatFloat(req.Amount, 'f', 0, 64) + " withdrawn to your wallet!",
		"data": gin.H{
			"amount_withdrawn":        req.Amount,
			"new_withdrawable_credit": info.WithdrawableCredit,
			"total_withdrawn":         info.TotalWithdrawn,
			"remaining_withdrawable":  info.AvailableToWithdraw,
		},
	})
}

// GetCreditHistory returns the user's credit transaction history
// GET /referral/history
func (r *ReferralController) GetCreditHistory(c *gin.Context) {
	logger.Info("GetCreditHistory")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if isGuest {
		c.JSON(http.StatusBadRequest, gin.H{"error": "guests cannot access credit history"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	entries, total, err := r.service.GetCreditHistory(userIdentifier, page, limit)
	if err != nil {
		logger.Error("Error getting credit history: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"data":    entries,
		"page":    page,
		"limit":   limit,
		"total":   total,
	})
}

// GetReferees returns the list of users referred by the current user
// GET /referral/referees
func (r *ReferralController) GetReferees(c *gin.Context) {
	logger.Info("GetReferees")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if isGuest {
		c.JSON(http.StatusBadRequest, gin.H{"error": "guests cannot access referees"})
		return
	}

	// Get user's username
	info, err := r.service.GetReferralInfo(userIdentifier)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// Strip @ from referral ID to get username
	username := info.ReferralID[1:] // Remove leading @

	referees, total, err := r.service.GetReferees(username, page, limit)
	if err != nil {
		logger.Error("Error getting referees: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"data":    referees,
		"page":    page,
		"limit":   limit,
		"total":   total,
	})
}

// GetTotalCredit returns just the total credit balance for a user (for quick checks)
// GET /referral/balance
func (r *ReferralController) GetTotalCredit(c *gin.Context) {
	logger.Info("GetTotalCredit")

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if isGuest {
		c.JSON(http.StatusOK, gin.H{
			"message": "successful",
			"data": gin.H{
				"total_credit": 0,
			},
		})
		return
	}

	total, err := r.service.GetTotalCredit(userIdentifier)
	if err != nil {
		logger.Error("Error getting total credit: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"data": gin.H{
			"total_credit": total,
		},
	})
}
