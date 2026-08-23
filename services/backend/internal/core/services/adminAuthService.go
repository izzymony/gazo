package services

import (
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"insta-api/internal/adapter/api/requests"
	mysql_repo "insta-api/internal/adapter/repositories/sql"
	"insta-api/internal/core/domain"
	"insta-api/internal/helper"
	"insta-api/internal/ports"
)

const (
	MaxFailedLoginAttempts = 5
	AccountLockDuration    = 30 * time.Minute
	TokenExpirationTime    = 24 * time.Hour
)

type AdminAuthService struct {
	adminAuthRepo ports.AdminAuthInterface
}

func NewAdminAuthService(db *gorm.DB) *AdminAuthService {
	return &AdminAuthService{
		adminAuthRepo: mysql_repo.NewAdminAuthRepository(db),
	}
}

// AuthenticateAdmin handles admin login authentication
func (s *AdminAuthService) AuthenticateAdmin(email, password, clientIP, userAgent string) (*domain.AdminAuthResponse, error) {
	// Get admin user by email
	adminUser, err := s.adminAuthRepo.GetAdminUserByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid credentials")
		}
		return nil, fmt.Errorf("failed to retrieve admin user: %w", err)
	}

	// Check if account is locked
	if adminUser.LockedUntil != nil && adminUser.LockedUntil.After(time.Now()) {
		return nil, fmt.Errorf("account is locked until %s", adminUser.LockedUntil.Format("2006-01-02 15:04:05"))
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(adminUser.PasswordHash), []byte(password)); err != nil {
		// Increment failed login attempts
		if incrementErr := s.adminAuthRepo.IncrementFailedLoginAttempts(adminUser.ID); incrementErr != nil {
			// Log error but don't fail the request
		}
		
		// Lock account if max attempts exceeded
		if adminUser.FailedLoginAttempts+1 >= MaxFailedLoginAttempts {
			if lockErr := s.adminAuthRepo.LockAdminAccount(adminUser.ID, AccountLockDuration); lockErr != nil {
				// Log error but don't fail the request
			}
		}
		
		return nil, errors.New("invalid credentials")
	}

	// Reset failed login attempts on successful authentication
	if err := s.adminAuthRepo.ResetFailedLoginAttempts(adminUser.ID); err != nil {
		// Log error but don't fail the request
	}

	// Generate JWT token
	token, err := s.generateAdminToken(adminUser)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Create session
	session := &domain.AdminSession{
		AdminID:   adminUser.ID,
		TokenHash: token,
		ExpiresAt: time.Now().Add(TokenExpirationTime),
		IPAddress: &clientIP,
		UserAgent: &userAgent,
		IsActive:  true,
	}

	if err := s.adminAuthRepo.CreateSession(session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return &domain.AdminAuthResponse{
		AdminID:     adminUser.ID,
		Email:       adminUser.Email,
		Name:        adminUser.Name,
		Role:        adminUser.Role,
		Permissions: adminUser.Permissions,
		Token:       token,
		ExpiresAt:   session.ExpiresAt,
	}, nil
}

// InvalidateSession invalidates an admin session
func (s *AdminAuthService) InvalidateSession(tokenString string) error {
	return s.adminAuthRepo.InvalidateSession(tokenString)
}

// RefreshAdminToken generates a new token for an existing session
func (s *AdminAuthService) RefreshAdminToken(adminID, currentToken, clientIP, userAgent string) (*domain.AdminAuthResponse, error) {
	// Verify current session is valid
	session, err := s.adminAuthRepo.GetSessionByTokenHash(currentToken)
	if err != nil {
		return nil, errors.New("invalid session")
	}

	if session.AdminID != adminID {
		return nil, errors.New("session mismatch")
	}

	// Get admin user
	adminUser, err := s.adminAuthRepo.GetAdminUserByID(adminID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve admin user: %w", err)
	}

	// Invalidate current session
	if err := s.adminAuthRepo.InvalidateSession(currentToken); err != nil {
		return nil, fmt.Errorf("failed to invalidate current session: %w", err)
	}

	// Generate new token
	newToken, err := s.generateAdminToken(adminUser)
	if err != nil {
		return nil, fmt.Errorf("failed to generate new token: %w", err)
	}

	// Create new session
	newSession := &domain.AdminSession{
		AdminID:   adminUser.ID,
		TokenHash: newToken,
		ExpiresAt: time.Now().Add(TokenExpirationTime),
		IPAddress: &clientIP,
		UserAgent: &userAgent,
		IsActive:  true,
	}

	if err := s.adminAuthRepo.CreateSession(newSession); err != nil {
		return nil, fmt.Errorf("failed to create new session: %w", err)
	}

	return &domain.AdminAuthResponse{
		AdminID:     adminUser.ID,
		Email:       adminUser.Email,
		Name:        adminUser.Name,
		Role:        adminUser.Role,
		Permissions: adminUser.Permissions,
		Token:       newToken,
		ExpiresAt:   newSession.ExpiresAt,
	}, nil
}

// GetAdminProfile returns admin profile information
func (s *AdminAuthService) GetAdminProfile(adminID string) (*domain.AdminProfile, error) {
	adminUser, err := s.adminAuthRepo.GetAdminUserByID(adminID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve admin profile: %w", err)
	}

	return &domain.AdminProfile{
		ID:          adminUser.ID,
		Email:       adminUser.Email,
		Name:        adminUser.Name,
		Role:        adminUser.Role,
		Permissions: adminUser.Permissions,
		IsActive:    adminUser.IsActive,
		LastLoginAt: adminUser.LastLoginAt,
		CreatedAt:   adminUser.CreatedAt,
	}, nil
}

// UpdateAdminProfile updates admin profile information
func (s *AdminAuthService) UpdateAdminProfile(adminID string, req *requests.UpdateAdminProfileRequest) (*domain.AdminProfile, error) {
	adminUser, err := s.adminAuthRepo.GetAdminUserByID(adminID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve admin user: %w", err)
	}

	// Update fields if provided
	if req.Name != "" {
		adminUser.Name = req.Name
	}
	if req.Email != "" {
		// Check if email is already taken by another admin
		existingAdmin, err := s.adminAuthRepo.GetAdminUserByEmail(req.Email)
		if err == nil && existingAdmin.ID != adminID {
			return nil, errors.New("email already in use by another admin")
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to check email availability: %w", err)
		}
		adminUser.Email = req.Email
	}

	adminUser.UpdatedAt = time.Now()

	if err := s.adminAuthRepo.UpdateAdminUser(adminUser); err != nil {
		return nil, fmt.Errorf("failed to update admin profile: %w", err)
	}

	return s.GetAdminProfile(adminID)
}

// ChangeAdminPassword changes an admin user's password
func (s *AdminAuthService) ChangeAdminPassword(adminID, currentPassword, newPassword string) error {
	adminUser, err := s.adminAuthRepo.GetAdminUserByID(adminID)
	if err != nil {
		return fmt.Errorf("failed to retrieve admin user: %w", err)
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(adminUser.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}

	// Update password in database
	if err := s.adminAuthRepo.UpdateAdminPassword(adminID, string(hashedPassword)); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Invalidate all existing sessions for security
	if err := s.adminAuthRepo.InvalidateAllUserSessions(adminID); err != nil {
		// Log error but don't fail the request
	}

	return nil
}

// LogAuditEvent logs an admin action for audit purposes
func (s *AdminAuthService) LogAuditEvent(adminID, adminEmail, action, resourceType, resourceID string, details map[string]interface{}, status string) error {
	auditLog := &domain.AdminAuditLog{
		AdminEmail:   adminEmail,
		Action:       action,
		ResourceType: resourceType,
		Details:      details,
		Status:       status,
	}
	
	// Only set AdminID if it's not empty
	if adminID != "" {
		auditLog.AdminID = &adminID
	}
	
	// Only set ResourceID if it's not empty 
	if resourceID != "" {
		auditLog.ResourceID = &resourceID
	}

	// Extract IP and User Agent from details if available
	if ip, exists := details["ip"]; exists {
		if ipStr, ok := ip.(string); ok {
			auditLog.IPAddress = &ipStr
		}
	}
	if userAgent, exists := details["user_agent"]; exists {
		if userAgentStr, ok := userAgent.(string); ok {
			auditLog.UserAgent = &userAgentStr
		}
	}

	return s.adminAuthRepo.CreateAuditLog(auditLog)
}

// GetAuditLogs retrieves audit logs with filters and pagination
func (s *AdminAuthService) GetAuditLogs(page, limit int, adminID, action, resourceType, startDate, endDate string) ([]domain.AdminAuditLog, int64, error) {
	return s.adminAuthRepo.GetAuditLogs(page, limit, adminID, action, resourceType, startDate, endDate)
}

// ValidateAdminSession validates an admin session token
func (s *AdminAuthService) ValidateAdminSession(tokenString string) (*domain.AdminUser, error) {
	session, err := s.adminAuthRepo.GetSessionByTokenHash(tokenString)
	if err != nil {
		return nil, errors.New("invalid session")
	}

	if session.Admin == nil {
		return nil, errors.New("invalid session admin")
	}

	return session.Admin, nil
}

// generateAdminToken generates a JWT token for admin authentication
func (s *AdminAuthService) generateAdminToken(adminUser *domain.AdminUser) (string, error) {
	// Create signed JWT
	signedDetails := helper.SignedDetails{
		Email:   adminUser.Email,
		UserId:  adminUser.ID,
		IsAdmin: true,
	}

	token, err := helper.GenerateJWT(signedDetails)
	if err != nil {
		return "", fmt.Errorf("failed to generate JWT: %w", err)
	}

	return token, nil
}

// CreateAdminUser creates a new admin user (for admin management)
func (s *AdminAuthService) CreateAdminUser(req *requests.AdminUserCreateRequest) (*domain.AdminProfile, error) {
	// Check if email already exists
	if _, err := s.adminAuthRepo.GetAdminUserByEmail(req.Email); err == nil {
		return nil, errors.New("admin user with this email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create admin user
	adminUser := &domain.AdminUser{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Name:         req.Name,
		Role:         req.Role,
		Permissions:  req.Permissions,
		IsActive:     req.IsActive,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.adminAuthRepo.CreateAdminUser(adminUser); err != nil {
		return nil, fmt.Errorf("failed to create admin user: %w", err)
	}

	return &domain.AdminProfile{
		ID:          adminUser.ID,
		Email:       adminUser.Email,
		Name:        adminUser.Name,
		Role:        adminUser.Role,
		Permissions: adminUser.Permissions,
		IsActive:    adminUser.IsActive,
		CreatedAt:   adminUser.CreatedAt,
	}, nil
}

// CleanupExpiredSessions removes expired and inactive sessions
func (s *AdminAuthService) CleanupExpiredSessions() error {
	return s.adminAuthRepo.CleanupExpiredSessions()
}

// GetRolePermissions retrieves permissions for a specific role
func (s *AdminAuthService) GetRolePermissions(roleName string) (map[string]interface{}, error) {
	role, err := s.adminAuthRepo.GetRoleByName(roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve role: %w", err)
	}
	return role.Permissions, nil
}

// Helper function to check if user has specific permission
func (s *AdminAuthService) HasPermission(adminUser *domain.AdminUser, resource, action string) bool {
	// Super admin has all permissions
	if adminUser.Role == "super_admin" {
		return true
	}

	// Check user-specific permissions first
	if adminUser.Permissions != nil {
		if resourcePerms, exists := adminUser.Permissions[resource]; exists {
			if perms, ok := resourcePerms.([]interface{}); ok {
				for _, perm := range perms {
					if permStr, ok := perm.(string); ok && permStr == action {
						return true
					}
				}
			}
		}
	}

	// Fall back to role-based permissions
	role, err := s.adminAuthRepo.GetRoleByName(adminUser.Role)
	if err != nil {
		return false
	}

	if resourcePerms, exists := role.Permissions[resource]; exists {
		if perms, ok := resourcePerms.([]interface{}); ok {
			for _, perm := range perms {
				if permStr, ok := perm.(string); ok && permStr == action {
					return true
				}
			}
		}
	}

	return false
}

// NotifyAdmins sends notifications to admins based on roles
func (s *AdminAuthService) NotifyAdmins(req *requests.BulkAdminNotificationRequest) error {
	var targetAdmins []domain.AdminUser
	var err error

	if len(req.AdminIDs) > 0 {
		// Get specific admin users
		for _, adminID := range req.AdminIDs {
			admin, adminErr := s.adminAuthRepo.GetAdminUserByID(adminID)
			if adminErr == nil {
				targetAdmins = append(targetAdmins, *admin)
			}
		}
	} else if len(req.Roles) > 0 {
		// Get admins by roles
		targetAdmins, err = s.adminAuthRepo.GetAdminsByRoles(req.Roles)
		if err != nil {
			return fmt.Errorf("failed to retrieve admins by roles: %w", err)
		}
	} else {
		return errors.New("either admin_ids or roles must be specified")
	}

	if len(targetAdmins) == 0 {
		return errors.New("no target admins found")
	}

	// Create notifications for all target admins
	var notifications []domain.AdminNotification
	for _, admin := range targetAdmins {
		notification := domain.AdminNotification{
			AdminID:   admin.ID,
			Type:      req.Type,
			Title:     req.Title,
			Message:   req.Message,
			Data:      req.Data,
			Priority:  req.Priority,
			ExpiresAt: req.ExpiresAt,
		}
		notifications = append(notifications, notification)
	}

	return s.adminAuthRepo.CreateBulkNotifications(notifications)
}