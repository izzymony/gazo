package controller

import (
	"math"
	"net/http"
	"strconv"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminController struct {
	service *services.AdminService
}

func NewAdminController(db *gorm.DB) *AdminController {
	return &AdminController{
		service: services.NewAdminService(db),
	}
}

func (s *AdminController) Login(c *gin.Context) {
	logger.Info("storeUser")

	request := requests.LoginRequest{}
	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	resp, err := s.service.Login(request)
	if err != nil {
		logger.Error("Error saving user " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *AdminController) ApproveWithdrawal(c *gin.Context) {
	id := c.Param("id")

	err := s.service.ApproveWithdrawal(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Withdrawal approved"})
}

func (s *AdminController) RejectWithdrawal(c *gin.Context) {
	id := c.Param("id")

	request := requests.WithdrawalRequestResponse{}

	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	err = s.service.RejectWithdrawal(id, request.Reason)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Withdrawal rejected"})
}

func (s *AdminController) GetAllWithdrawalRequests(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	resp, total, err := s.service.GetAllWithdrawalRequests(limit, page)
	if err != nil {
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

// GetDashboardStats returns the platform-wide summary for the admin dashboard +
// analytics pages. Shape: { "data": { total_users, total_businesses, ... } }.
func (s *AdminController) GetDashboardStats(c *gin.Context) {
	stats, err := s.service.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": stats})
}

func (s *AdminController) GetWithdrawalRequestByID(c *gin.Context) {
	id := c.Param("id")

	request, err := s.service.GetWithdrawalRequestByID(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(request, nil))
}

func (s *AdminController) GetAllOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	resp, total, err := s.service.GetAllOrders(page, limit)
	if err != nil {
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

// GetAllOrderItemsList returns all order items (matching seller dashboard format)
func (s *AdminController) GetAllOrderItemsList(c *gin.Context) {
	logger.Info("GetAllOrderItemsList")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	resp, total, err := s.service.GetAllOrderItemsList(page, limit)
	if err != nil {
		logger.Error("Error fetching order items: " + err.Error())
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

func (s *AdminController) GetOrderItems(c *gin.Context) {
	logger.Info("GetOrderItems")

	orderId := c.Param("order_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	resp, total, err := s.service.GetOrderItems(orderId, page, limit)
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

func (s *AdminController) GetOrderItem(c *gin.Context) {
	logger.Info("GetOrderItem")

	id := c.Param("id")

	resp, err := s.service.GetOrderItem(id)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *AdminController) GetAllProducts(c *gin.Context) {
	logger.Info("GetAllProducts")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetAllProducts(search, page, limit)
	if err != nil {
		logger.Error("Error fetching business " + err.Error())
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

func (s *AdminController) GetProduct(c *gin.Context) {
	logger.Info("GetProduct")

	id := c.Param("id")

	resp, err := s.service.GetOneProduct(id)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *AdminController) GetUser(c *gin.Context) {
	logger.Info("GetUser")

	userId := c.Param("user_id")

	resp, err := s.service.GetUser(userId)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *AdminController) GetBusiness(c *gin.Context) {
	logger.Info("GetBusiness")

	businessId := c.Param("business_id")

	resp, err := s.service.GetOneBusiness(businessId)
	if err != nil {
		logger.Error("Error saving sprint" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *AdminController) GetAllBusinesses(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetAllBusinesses(search, page, limit)
	if err != nil {
		logger.Error("Error fetching business " + err.Error())
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

func (s *AdminController) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetAllUsers(search, page, limit)
	if err != nil {
		logger.Error("Error fetching business " + err.Error())
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

func (s *AdminController) UpdateUser(c *gin.Context) {
	userId := c.Param("user_id")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	err := s.service.UpdateUser(userId, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user updated successfully"})
}

func (s *AdminController) DeleteUser(c *gin.Context) {
	userId := c.Param("user_id")

	err := s.service.DeleteUser(userId)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deleted successfully"})
}

func (s *AdminController) GetWalletTransactions(c *gin.Context) {
	logger.Info("GetWalletTransactions")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	transactionType := c.DefaultQuery("transaction_type", "")

	businessId := c.Param("business_id")

	resp, total, err := s.service.GetWalletTransactions(businessId, transactionType, page, limit)
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

func (s *AdminController) GetWalletTransaction(c *gin.Context) {
	logger.Info("GetWalletTransaction")

	id := c.Param("id")

	resp, err := s.service.GetWalletTransaction(id)
	if err != nil {
		logger.Error("Error saving transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *AdminController) GetWalletBalances(c *gin.Context) {
	businessId := c.Param("business_id")
	wallet, err := s.service.GetWalletBalances(businessId)
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

func (s *AdminController) ReviewKYC(c *gin.Context) {
	id := c.Param("id")

	var req requests.ReviewKYC

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	reviewedBy := c.GetString("user_id") // reviewing admin's id (from JWT) — audit trail
	kyc, err := s.service.ReviewKYC(id, req.Status, req.Reason, reviewedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(kyc, nil))
}

func (s *AdminController) GetAllKYC(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	data, total, err := s.service.GetAllKYC(page, limit, search)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":       response.NewCustomArrayResponse(data, err),
		"page":       page,
		"limit":      limit,
		"total":      total,
		"totalPages": int(math.Ceil(float64(total) / float64(limit))),
	})
}

// Admin Shipping Endpoints - Safe admin-only endpoints in /api/v1/admin/* namespace

func (s *AdminController) GetAllShipments(c *gin.Context) {
	logger.Info("GetAllShipments endpoint called")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	resp, total, err := s.service.GetAllShipments(page, limit)
	if err != nil {
		logger.Error("Error fetching shipments: " + err.Error())
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

func (s *AdminController) GetShipment(c *gin.Context) {
	logger.Info("GetShipment endpoint called")

	id := c.Param("id")

	resp, err := s.service.GetShipment(id)
	if err != nil {
		logger.Error("Error fetching shipment: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	logger.Info("Shipment retrieved successfully")
	c.JSON(http.StatusOK, response.NewCustomResponse(resp, nil))
}

func (s *AdminController) UpdateShippingStatus(c *gin.Context) {
	logger.Info("UpdateShippingStatus endpoint called")

	orderItemID := c.Param("order_item_id")

	var request requests.UpdateShippingStatusRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Validate status
	validStatuses := []string{"confirmed", "picked_up", "in_transit", "completed", "cancelled"}
	isValid := false
	for _, status := range validStatuses {
		if request.Status == status {
			isValid = true
			break
		}
	}
	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Must be: confirmed, picked_up, in_transit, completed, or cancelled"})
		return
	}

	result, err := s.service.UpdateShippingStatus(orderItemID, request.Status, request.Reason, request.Notes)
	if err != nil {
		logger.Error("Error updating shipping status: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	logger.Info("Shipping status updated successfully")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Shipping status updated successfully",
		"data":    result,
	})
}

func (s *AdminController) DeleteOrderItem(c *gin.Context) {
	logger.Info("DeleteOrderItem endpoint called")

	id := c.Param("id")

	err := s.service.DeleteOrderItem(id)
	if err != nil {
		logger.Error("Error deleting order item: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order item deleted successfully"})
}

func (s *AdminController) DeleteOrder(c *gin.Context) {
	logger.Info("DeleteOrder endpoint called")

	orderId := c.Param("id")

	err := s.service.DeleteOrder(orderId)
	if err != nil {
		logger.Error("Error deleting order: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order deleted successfully"})
}
