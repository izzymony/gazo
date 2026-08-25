package controller

import (
	"net/http"
	"strconv"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminReferralController struct {
	service *services.ReferralService
}

func NewAdminReferralController(db *gorm.DB) *AdminReferralController {
	return &AdminReferralController{
		service: services.NewReferralService(db),
	}
}

// GetReferralStats returns overall referral program statistics
// GET /admin/referral/stats
func (r *AdminReferralController) GetReferralStats(c *gin.Context) {
	logger.Info("Admin: GetReferralStats")

	stats, err := r.service.GetReferralStats()
	if err != nil {
		logger.Error("Error getting referral stats: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(stats, nil))
}

// GetUsersWithReferralData returns paginated list of users with their referral data
// GET /admin/referral/users
func (r *AdminReferralController) GetUsersWithReferralData(c *gin.Context) {
	logger.Info("Admin: GetUsersWithReferralData")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	search := c.DefaultQuery("search", "")

	users, total, err := r.service.GetUsersWithReferralData(search, page, limit)
	if err != nil {
		logger.Error("Error getting users with referral data: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"data":    users,
		"page":    page,
		"limit":   limit,
		"total":   total,
	})
}

// GetUserCreditDetails returns a specific user's credit details and history
// GET /admin/referral/users/:id/credits
func (r *AdminReferralController) GetUserCreditDetails(c *gin.Context) {
	logger.Info("Admin: GetUserCreditDetails")

	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user id is required"})
		return
	}

	user, entries, err := r.service.GetUserCreditDetails(userID)
	if err != nil {
		logger.Error("Error getting user credit details: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "successful",
		"data": gin.H{
			"user": gin.H{
				"id":                    user.ID,
				"username":              user.UserName,
				"email":                 user.Email,
				"shopping_credit":       user.ShoppingCredit,
				"withdrawable_credit":   user.WithdrawableCredit,
				"total_referral_earned": user.TotalReferralEarned,
				"total_withdrawn":       user.TotalWithdrawn,
				"referred_by_username":  user.ReferredByUsername,
				"referral_activated":    user.ReferralActivated,
			},
			"credit_entries": entries,
		},
	})
}

// ManualCreditAdjustment performs a manual credit adjustment for a user
// POST /admin/referral/credit/adjust
func (r *AdminReferralController) ManualCreditAdjustment(c *gin.Context) {
	logger.Info("Admin: ManualCreditAdjustment")

	var req requests.AdminCreditAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	if err := r.service.ManualCreditAdjustment(req.UserID, req.Amount, req.CreditType, req.Reason); err != nil {
		logger.Error("Error adjusting credit: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get updated user details
	user, _, err := r.service.GetUserCreditDetails(req.UserID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "Credit adjusted successfully",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Credit adjusted successfully",
		"data": gin.H{
			"user_id":             req.UserID,
			"adjustment_amount":   req.Amount,
			"credit_type":         req.CreditType,
			"reason":              req.Reason,
			"new_shopping_credit": user.ShoppingCredit,
			"new_withdrawable_credit": user.WithdrawableCredit,
		},
	})
}

// GetReferralInfo returns referral info for a specific user (admin view)
// GET /admin/referral/users/:id/info
func (r *AdminReferralController) GetUserReferralInfo(c *gin.Context) {
	logger.Info("Admin: GetUserReferralInfo")

	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user id is required"})
		return
	}

	info, err := r.service.GetReferralInfo(userID)
	if err != nil {
		logger.Error("Error getting user referral info: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(info, nil))
}
