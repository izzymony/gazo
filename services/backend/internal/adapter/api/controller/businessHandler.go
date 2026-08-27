package controller

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	fileupload "github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/file-upload"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BusinessController struct {
	service *services.BusinessService
	// The P12 dashboard-summary aggregate pulls from a few domains.
	wallet       *services.WalletService
	notification *services.NotificationService
	product      *services.ProductService
	businessRepo ports.BusinessIface
}

func NewBusinessController(db *gorm.DB) *BusinessController {
	return &BusinessController{
		service:      services.NewBusinessService(db),
		wallet:       services.NewWalletService(db),
		notification: services.NewNotificationService(db),
		product:      services.NewProductService(db),
		businessRepo: mysql_repo.NewBusinessRepository(db),
	}
}

func (s *BusinessController) GetAllBusiness(c *gin.Context) {
	logger.Info("GetAllBusiness")

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

func (s *BusinessController) UpdateBusiness(c *gin.Context) {
	logger.Info("UpdateBusiness")

	id := c.Param("id")
	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if it's multipart form data (logo upload)
	contentType := c.GetHeader("Content-Type")
	var business domain.Business

	if strings.Contains(contentType, "multipart/form-data") {
		// Handle form data with logo
		business.Name = c.PostForm("name")
		business.Tag = c.PostForm("tag")
		business.Email = c.PostForm("email")
		business.Phone = c.PostForm("phone")
		business.Category = c.PostForm("category")

		// Handle logo file if present
		file, _, err := c.Request.FormFile("logo")
		if err == nil && file != nil {
			defer file.Close()
			// Upload logo with fallback (local storage when Cloudinary unavailable)
			logoURL, err := fileupload.UploadFileWithFallback(file)
			if err != nil {
				logger.Error("Error uploading logo: " + err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload logo"})
				return
			}
			business.Logo = logoURL
		}
	} else {
		// Handle JSON data
		request := requests.Business{}
		err := c.ShouldBindJSON(&request)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}
		helper.Copy(request, &business)
	}

	resp, err := s.service.UpdateBusiness(id, userIdentifier, business)
	if err != nil {
		logger.Error("Error saving business " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) GetAuthenticatedUserBusiness(c *gin.Context) {
	logger.Info("GetAuthenticatedUserBusiness")

	userIdentifier, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userId := userIdentifier.(string)
	resp, err := s.service.GetAuthenticatedUserBusiness(userId)
	if err != nil {
		logger.Error("Error finding user business " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) GetBusiness(c *gin.Context) {
	logger.Info("GetBusiness")

	id := c.Param("id")

	resp, err := s.service.GetBusiness(id)
	if err != nil {
		logger.Error("Error finding business " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// GetBusinessByTag resolves a public storefront by its tag (STOREFRONT-URL-REWORK).
func (s *BusinessController) GetBusinessByTag(c *gin.Context) {
	logger.Info("GetBusinessByTag")

	tag := c.Param("tag")

	resp, err := s.service.GetBusinessByTag(tag)
	if err != nil {
		logger.Error("Error finding business by tag " + err.Error())
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// CheckTagAvailability validates a candidate store tag for the seller setup flow.
// `business_id` (optional) excludes the caller's own store from the uniqueness check.
func (s *BusinessController) CheckTagAvailability(c *gin.Context) {
	logger.Info("CheckTagAvailability")

	tag := c.Query("tag")
	excludeID := c.Query("business_id")

	if err := s.service.ValidateTag(tag, excludeID); err != nil {
		c.JSON(http.StatusConflict, gin.H{"available": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"available": true})
}

func (s *BusinessController) GetBusinessMetric(c *gin.Context) {
	logger.Info("FindBusiness")

	id := c.Param("id")

	resp, err := s.service.BusinessMetric(id)
	if err != nil {
		logger.Error("Error Fetchin business metrics " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) CreateBusiness(c *gin.Context) {
	logger.Info("CreateBusiness")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if it's multipart form data (logo upload)
	contentType := c.GetHeader("Content-Type")
	var request requests.Business

	if strings.Contains(contentType, "multipart/form-data") {
		// Handle form data with logo
		request.Name = c.PostForm("name")
		request.Tag = c.PostForm("tag")
		request.Email = c.PostForm("email")
		request.Phone = c.PostForm("phone")
		request.Category = c.PostForm("category")
		request.UserID = userIdentifier

		// Handle nested address object
		address := &requests.BusinessAddress{
			Country:     c.PostForm("address[country]"),
			Area:        &[]string{c.PostForm("address[province]")}[0],
			AddressLine: c.PostForm("address[address_line]"),
		}
		request.Address = address

		// Handle nested business setting object
		shippingAmount := 0.0
		if amount := c.PostForm("business_setting[shipping_amount]"); amount != "" {
			if parsed, parseErr := strconv.ParseFloat(amount, 64); parseErr == nil {
				shippingAmount = parsed
			}
		}
		businessSetting := &requests.BusinessSetting{
			ShippingAmount: shippingAmount,
			ShippingType:   c.PostForm("business_setting[shipping_type]"),
		}
		request.BusinessSetting = businessSetting

		// Handle logo file if present
		file, _, err := c.Request.FormFile("logo")
		if err == nil && file != nil {
			defer file.Close()
			// Upload logo with fallback (local storage when Cloudinary unavailable)
			logoURL, err := fileupload.UploadFileWithFallback(file)
			if err != nil {
				logger.Error("Error uploading logo: " + err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload logo"})
				return
			}
			// Store logo URL in business data
			request.Logo = logoURL
			logger.Info("Logo uploaded successfully: " + logoURL)
		}

	} else {
		// Handle JSON data
		err := c.ShouldBindJSON(&request)
		if err != nil {
			logger.Error("JSON binding error: " + err.Error())
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}
		request.UserID = userIdentifier
	}

	resp, err := s.service.CreateBusiness(request)
	if err != nil {
		logger.Error("error saving business " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) UploadBackgroundImage(c *gin.Context) {
	logger.Info("upload background image")

	businessID := c.Param("id")
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File upload error"})
		return
	}
	defer file.Close()

	filePath, err := s.service.UploadBackgroundImage(businessID, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Background image uploaded", "path": filePath})
}

func (s *BusinessController) DeleteBackgroundImage(c *gin.Context) {
	logger.Info("delete background image")

	businessID := c.Param("id")
	err := s.service.DeleteBackgroundImage(businessID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Background image deleted successfully"})
}

func (s *BusinessController) GetBackgroundSettings(c *gin.Context) {
	logger.Info("get background settings")

	businessID := c.Param("id")
	settings, err := s.service.GetBackgroundSettings(businessID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, settings)
}

func (s *BusinessController) UpdateBackgroundColor(c *gin.Context) {
	logger.Info("upload background color")

	businessID := c.Param("id")
	var payload struct {
		BackgroundColor   string `json:"background_color"`
		BackgroundPattern string `json:"background_pattern"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	err := s.service.UpdateBackgroundColor(businessID, payload.BackgroundColor, payload.BackgroundPattern)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Background color updated successfully"})
}

func (s *BusinessController) UpdateShippingSettings(c *gin.Context) {
	logger.Info("UpdateShippingSettings")

	businessID := c.Param("id")
	userId, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var payload struct {
		PartnerEnabled bool             `json:"partner_enabled"`
		SelfZones      domain.SelfZones `json:"self_zones"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := s.service.UpdateShippingSettings(businessID, userId, payload.PartnerEnabled, payload.SelfZones); err != nil {
		logger.Error("error updating shipping settings: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Shipping settings updated successfully"})
}

func (s *BusinessController) AddRecentlyViewedBusinesses(c *gin.Context) {
	logger.Info("AddRecentlyViewedBusinesses")

	request := requests.RecentlyViewedBusiness{}

	err := c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = s.service.AddRecentlyViewedBusinesses(request, userIdentifier, isGuest)
	if err != nil {
		logger.Error("error" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}

func (s *BusinessController) GetUserRecentlyViewedBusinesses(c *gin.Context) {
	logger.Info("GetUserRecentlyViewedBusinesses")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, isGuest, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetUserRecentlyViewedBusinesses(userIdentifier, isGuest, page, limit)
	if err != nil {
		logger.Error("error" + err.Error())
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

func (s *BusinessController) GetOrders(c *gin.Context) {
	logger.Info("GetOrders")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetOrders(userIdentifier, page, limit)
	if err != nil {
		logger.Error("error getting orders" + err.Error())
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

func (s *BusinessController) GetOrder(c *gin.Context) {
	logger.Info("GetOrder")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.GetOrder(id, userIdentifier)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) MarkOrderReady(c *gin.Context) {
	logger.Info("MarkOrderReady")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.MarkOrderReady(id, userIdentifier)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// MarkSelfOutForDelivery advances a Self-delivery order to "out for delivery"
// with an optional dispatch contact (name/phone/note).
func (s *BusinessController) MarkSelfOutForDelivery(c *gin.Context) {
	logger.Info("MarkSelfOutForDelivery")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var payload struct {
		Name  string `json:"name"`
		Phone string `json:"phone"`
		Note  string `json:"note"`
	}
	// Dispatch details are optional — an empty/missing body still marks it out
	// for delivery, so ignore a bind error.
	_ = c.ShouldBindJSON(&payload)

	resp, err := s.service.MarkSelfOutForDelivery(id, userIdentifier, payload.Name, payload.Phone, payload.Note)
	if err != nil {
		logger.Error("error marking order out for delivery" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// MarkSelfDelivered confirms a Self-delivery order was received and releases the
// seller's funds into the clearing balance.
func (s *BusinessController) MarkSelfDelivered(c *gin.Context) {
	logger.Info("MarkSelfDelivered")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.MarkSelfDelivered(id, userIdentifier)
	if err != nil {
		logger.Error("error marking order delivered" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) DebugMarkOrderReady(c *gin.Context) {
	logger.Info("DebugMarkOrderReady - bypassing authentication for testing")

	id := c.Param("id")

	// Use the test user ID for debugging (bypassing authentication)
	userIdentifier := "47ddada7-1d39-4867-b24c-6069ef3f9a3d"

	fmt.Printf("DEBUG ENDPOINT: MarkOrderReady called with orderId=%s, userIdentifier=%s\n", id, userIdentifier)

	resp, err := s.service.MarkOrderReady(id, userIdentifier)
	if err != nil {
		logger.Error("error in debug MarkOrderReady: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) CancelOrder(c *gin.Context) {
	logger.Info("CancelOrder")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := s.service.CancelOrder(id, userIdentifier)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) GetCustomerAnalytics(c *gin.Context) {
	logger.Info("GetCustomersAnalytics")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	date := c.DefaultQuery("date", "")

	resp, err := s.service.GetCustomerAnalytics(userIdentifier, date)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) GetCustomers(c *gin.Context) {
	logger.Info("GetCustomers")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.DefaultQuery("search", "")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetCustomers(userIdentifier, search, page, limit)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
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

func (s *BusinessController) GetProductRanking(c *gin.Context) {
	logger.Info("GetProductRanking")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, total, err := s.service.GetProductRanking(userIdentifier, page, limit)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
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

func (s *BusinessController) GetSalesAnalytics(c *gin.Context) {
	logger.Info("GetSalesAnalytics")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	date := c.DefaultQuery("date", "")

	resp, err := s.service.GetSalesAnalytics(userIdentifier, date)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) GetStoreAnalytics(c *gin.Context) {
	logger.Info("GetStoreAnalytics")

	businessId := c.Param("business_id")
	resp, err := s.service.GetStoreAnalytics(businessId)
	if err != nil {
		logger.Error("error fetching order" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

// GetDashboardSummary (P12) collapses the seller dashboard home's above-the-fold
// requests into ONE call: dashboard analytics, wallet balances, unread message +
// notification counts, recent activity (6), bank accounts, and product count. Each
// sub-fetch is best-effort — one failure degrades that field to a zero value rather
// than failing the whole dashboard, so the client can always render.
func (s *BusinessController) GetDashboardSummary(c *gin.Context) {
	logger.Info("GetDashboardSummary")
	userID, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	analytics, _ := s.service.GetDashboardAnalytics(userID)
	wallet, _ := s.wallet.GetWalletBalances(userID)
	unreadMessages, unreadNotifications, _ := s.notification.GetUnreadSummary(userID, false, "seller")
	notifications, _, _ := s.notification.GetUserNotifications(userID, "", "seller", 1, 6)

	var bankAccounts []domain.BusinessBankAccountDetail
	var productCount int64
	if biz, bErr := s.businessRepo.GetOne(map[string]interface{}{"user_id": userID}); bErr == nil && biz != nil {
		bankAccounts, _, _ = s.businessRepo.GetBankAccounts(biz.ID, 100, 0)
		_, productCount, _ = s.product.GetAllProductsOrderedByOrders(1, 1, "", "", "", biz.ID, "")
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(gin.H{
		"analytics":            analytics,
		"wallet":               wallet,
		"unread_messages":      unreadMessages,
		"unread_notifications": unreadNotifications,
		"notifications":        notifications,
		"bank_accounts":        bankAccounts,
		"product_count":        productCount,
	}, nil))
}

func (s *BusinessController) GetDashboardAnalytics(c *gin.Context) {
	logger.Info("GetDashboardAnalytics")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resp, err := s.service.GetDashboardAnalytics(userIdentifier)
	if err != nil {
		logger.Error("error fetching dashboard analytics" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}

func (s *BusinessController) GetAllProducts(c *gin.Context) {
	logger.Info("GetAllProducts")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetAllProducts(userIdentifier, search, page, limit)
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

func (s *BusinessController) GetDiscounts(c *gin.Context) {
	logger.Info("GetDiscounts")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetDiscounts(userIdentifier, search, page, limit)
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

func (s *BusinessController) GetFollowers(c *gin.Context) {
	logger.Info("GetFollowers")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	search := c.DefaultQuery("search", "")

	resp, total, err := s.service.GetFollowers(userIdentifier, search, page, limit)
	if err != nil {
		logger.Error("Error fetching followers " + err.Error())
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

func (s *BusinessController) CreateDiscount(c *gin.Context) {
	logger.Info("CreateDiscount")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request := requests.CreateDiscount{}

	err = c.ShouldBind(&request)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	err = s.service.CreateDiscount(userIdentifier, request)
	if err != nil {
		logger.Error("error creating discount" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(nil, err))
}

func (s *BusinessController) UpdateBusinessBankAccount(c *gin.Context) {
	logger.Info("UpdateBusinessBankAccount")

	id := c.Param("id")

	userIdentifier, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req requests.BusinessBankAccountDetail
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	err = s.service.UpdateBankAccountDetail(id, userIdentifier, req)
	if err != nil {
		logger.Error("error updating bank account detail: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bank account updated successfully"})
}

func (s *BusinessController) AddBankAccount(c *gin.Context) {
	var req requests.BusinessBankAccountDetail

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	err = s.service.AddBankAccountDetail(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bank account added successfully"})
}

func (s *BusinessController) GetBankAccounts(c *gin.Context) {
	pageStr := c.Query("page")
	limitStr := c.Query("limit")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	userID, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	accounts, total, err := s.service.GetBankAccounts(userID, page, limit)
	if err != nil {
		logger.Error(fmt.Sprintf("error fetching bank accounts: %v", err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch accounts"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  accounts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (s *BusinessController) DeleteBankAccount(c *gin.Context) {
	logger.Info("DeleteBankAccount")

	id := c.Param("id")

	userID, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	err = s.service.DeleteBankAccountDetail(id, userID)
	if err != nil {
		logger.Error("error deleting bank account: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bank account deleted successfully"})
}

func (s *BusinessController) GetProduct(c *gin.Context) {
	logger.Info("GetProduct")

	id := c.Param("id")

	userID, _, err := helper.GetUserIdentifier(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	product, err := s.service.GetOneProduct(userID, id)
	if err != nil {
		logger.Error("Error fetching product: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate combinations on-demand if product has variants
	var combinations []map[string]interface{}
	if product != nil && len(product.Variants) > 0 {
		combinations = s.service.CalculateProductCombinations(product)
	}

	// Return product with calculated combinations (matching public endpoint)
	resp := map[string]interface{}{
		"product":      product,
		"combinations": combinations,
	}

	c.JSON(http.StatusOK, response.NewCustomResponse(resp, err))
}
