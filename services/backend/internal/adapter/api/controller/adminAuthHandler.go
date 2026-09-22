package controller

import (
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/response"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminAuthController struct {
	service *services.AdminAuthService
}

func NewAdminAuthController(db *gorm.DB) *AdminAuthController {
	return &AdminAuthController{
		service: services.NewAdminAuthService(db),
	}
}

// extractTokenFromHeader extracts the Bearer token from Authorization header
func extractTokenFromHeader(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	
	tokenParts := strings.Split(authHeader, " ")
	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
		return ""
	}
	
	return tokenParts[1]
}

// AdminLogin handles admin user authentication
// POST /api/v1/admin/auth/login
func (a *AdminAuthController) AdminLogin(c *gin.Context) {
	logger.Info("AdminLogin endpoint called")

	var req requests.AdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request payload: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Validate request
	if req.Email == "" || req.Password == "" {
		logger.Error("Email and password are required")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	// Get client IP and user agent for audit logging
	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// Attempt authentication
	authResponse, err := a.service.AuthenticateAdmin(req.Email, req.Password, clientIP, userAgent)
	if err != nil {
		logger.Error("Admin authentication failed: " + err.Error())
		
		// Log failed login attempt
		a.service.LogAuditEvent("", req.Email, "admin_login_failed", "admin_session", "", map[string]interface{}{
			"email": req.Email,
			"ip": clientIP,
			"user_agent": userAgent,
		}, "failed")

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Log successful login
	a.service.LogAuditEvent(authResponse.AdminID, req.Email, "admin_login_success", "admin_session", "", map[string]interface{}{
		"ip": clientIP,
		"user_agent": userAgent,
	}, "success")

	// The admin id is the identity worth recording; the email is a contact
	// detail, and login logs are among the most widely read.
	logger.Info("admin authenticated successfully")
	c.JSON(http.StatusOK, response.NewCustomResponse(authResponse, nil))
}

// AdminLogout handles admin user logout
// POST /api/v1/admin/auth/logout  
func (a *AdminAuthController) AdminLogout(c *gin.Context) {
	logger.Info("AdminLogout endpoint called")

	// Get admin from context (set by auth middleware)
	adminID, exists := c.Get("admin_id")
	if !exists {
		logger.Error("Admin ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	adminEmail, _ := c.Get("admin_email")

	// Get authorization header to extract token
	tokenString := extractTokenFromHeader(c.GetHeader("Authorization"))
	if tokenString == "" {
		logger.Error("No token provided for logout")
		c.JSON(http.StatusBadRequest, gin.H{"error": "No token provided"})
		return
	}

	// Invalidate session
	err := a.service.InvalidateSession(tokenString)
	if err != nil {
		logger.Error("Failed to invalidate session: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to logout"})
		return
	}

	// Log logout event
	a.service.LogAuditEvent(adminID.(string), adminEmail.(string), "admin_logout", "admin_session", "", map[string]interface{}{
		"ip": c.ClientIP(),
		"user_agent": c.GetHeader("User-Agent"),
	}, "success")

	logger.Info("Admin logged out successfully: " + adminEmail.(string))
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

// RefreshToken handles admin token refresh
// POST /api/v1/admin/auth/refresh
func (a *AdminAuthController) RefreshToken(c *gin.Context) {
	logger.Info("RefreshToken endpoint called")

	// Get admin from context
	adminID, exists := c.Get("admin_id")
	if !exists {
		logger.Error("Admin ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	adminEmail, _ := c.Get("admin_email")

	// Get current token
	tokenString := extractTokenFromHeader(c.GetHeader("Authorization"))
	if tokenString == "" {
		logger.Error("No token provided for refresh")
		c.JSON(http.StatusBadRequest, gin.H{"error": "No token provided"})
		return
	}

	// Generate new token
	authResponse, err := a.service.RefreshAdminToken(adminID.(string), tokenString, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		logger.Error("Failed to refresh token: " + err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to refresh token"})
		return
	}

	// Log token refresh
	a.service.LogAuditEvent(adminID.(string), adminEmail.(string), "admin_token_refresh", "admin_session", "", map[string]interface{}{
		"ip": c.ClientIP(),
		"user_agent": c.GetHeader("User-Agent"),
	}, "success")

	logger.Info("admin token refreshed successfully")
	c.JSON(http.StatusOK, response.NewCustomResponse(authResponse, nil))
}

// GetProfile returns admin profile information
// GET /api/v1/admin/profile
func (a *AdminAuthController) GetProfile(c *gin.Context) {
	logger.Info("GetProfile endpoint called")

	adminID, exists := c.Get("admin_id")
	if !exists {
		logger.Error("Admin ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	profile, err := a.service.GetAdminProfile(adminID.(string))
	if err != nil {
		logger.Error("Failed to get admin profile: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get profile"})
		return
	}

	logger.Info("Admin profile retrieved successfully")
	c.JSON(http.StatusOK, response.NewCustomResponse(profile, nil))
}

// UpdateProfile updates admin profile information
// PATCH /api/v1/admin/profile
func (a *AdminAuthController) UpdateProfile(c *gin.Context) {
	logger.Info("UpdateProfile endpoint called")

	adminID, exists := c.Get("admin_id")
	if !exists {
		logger.Error("Admin ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	adminEmail, _ := c.Get("admin_email")

	var req requests.UpdateAdminProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request payload: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	updatedProfile, err := a.service.UpdateAdminProfile(adminID.(string), &req)
	if err != nil {
		logger.Error("Failed to update admin profile: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Log profile update
	a.service.LogAuditEvent(adminID.(string), adminEmail.(string), "admin_profile_updated", "admin_user", adminID.(string), map[string]interface{}{
		"updated_fields": req,
	}, "success")

	logger.Info("Admin profile updated successfully")
	c.JSON(http.StatusOK, response.NewCustomResponse(updatedProfile, nil))
}

// ChangePassword handles admin password change
// POST /api/v1/admin/auth/change-password
func (a *AdminAuthController) ChangePassword(c *gin.Context) {
	logger.Info("ChangePassword endpoint called")

	adminID, exists := c.Get("admin_id")
	if !exists {
		logger.Error("Admin ID not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	adminEmail, _ := c.Get("admin_email")

	var req requests.ChangeAdminPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid request payload: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Validate request
	if req.CurrentPassword == "" || req.NewPassword == "" {
		logger.Error("Current password and new password are required")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current password and new password are required"})
		return
	}

	err := a.service.ChangeAdminPassword(adminID.(string), req.CurrentPassword, req.NewPassword)
	if err != nil {
		logger.Error("Failed to change admin password: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to change password"})
		return
	}

	// Log password change
	a.service.LogAuditEvent(adminID.(string), adminEmail.(string), "admin_password_changed", "admin_user", adminID.(string), map[string]interface{}{
		"ip": c.ClientIP(),
		"user_agent": c.GetHeader("User-Agent"),
	}, "success")

	logger.Info("Admin password changed successfully")
	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// GetAuditLogs returns admin audit logs (paginated)
// GET /api/v1/admin/audit-logs
func (a *AdminAuthController) GetAuditLogs(c *gin.Context) {
	logger.Info("GetAuditLogs endpoint called")

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	
	// Parse filters
	adminID := c.Query("admin_id")
	action := c.Query("action")
	resourceType := c.Query("resource_type")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	logs, total, err := a.service.GetAuditLogs(page, limit, adminID, action, resourceType, startDate, endDate)
	if err != nil {
		logger.Error("Failed to get audit logs: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get audit logs"})
		return
	}

	// Calculate pagination info
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	
	paginationInfo := map[string]interface{}{
		"current_page": page,
		"total_pages":  totalPages,
		"total_count":  total,
		"limit":        limit,
		"has_next":     page < totalPages,
		"has_prev":     page > 1,
	}

	result := map[string]interface{}{
		"logs":       logs,
		"pagination": paginationInfo,
	}

	logger.Info("Audit logs retrieved successfully")
	c.JSON(http.StatusOK, response.NewCustomResponse(result, nil))
}