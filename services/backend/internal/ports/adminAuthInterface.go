package ports

import (
	"time"
	"vibaar/backend/internal/core/domain"
)

// AdminAuthInterface defines the contract for admin authentication operations
type AdminAuthInterface interface {
	// Admin User Operations
	CreateAdminUser(adminUser *domain.AdminUser) error
	GetAdminUserByEmail(email string) (*domain.AdminUser, error)
	GetAdminUserByID(id string) (*domain.AdminUser, error)
	UpdateAdminUser(adminUser *domain.AdminUser) error
	UpdateAdminPassword(adminID string, hashedPassword string) error
	IncrementFailedLoginAttempts(adminID string) error
	ResetFailedLoginAttempts(adminID string) error
	LockAdminAccount(adminID string, lockDuration time.Duration) error
	
	// Session Operations
	CreateSession(session *domain.AdminSession) error
	GetSessionByTokenHash(tokenHash string) (*domain.AdminSession, error)
	InvalidateSession(tokenHash string) error
	InvalidateAllUserSessions(adminID string) error
	CleanupExpiredSessions() error
	
	// Audit Log Operations
	CreateAuditLog(auditLog *domain.AdminAuditLog) error
	GetAuditLogs(page, limit int, adminID, action, resourceType, startDate, endDate string) ([]domain.AdminAuditLog, int64, error)
	
	// Role Operations
	GetRoleByName(name string) (*domain.AdminRole, error)
	GetAllActiveRoles() ([]domain.AdminRole, error)
	
	// Notification Operations
	CreateNotification(notification *domain.AdminNotification) error
	CreateBulkNotifications(notifications []domain.AdminNotification) error
	GetUnreadNotificationCount(adminID string) (int64, error)
	GetNotificationsByAdminID(adminID string, page, limit int) ([]domain.AdminNotification, int64, error)
	MarkNotificationAsRead(notificationID string) error
	MarkAllNotificationsAsRead(adminID string) error
	GetAdminsByRole(role string) ([]domain.AdminUser, error)
	GetAdminsByRoles(roles []string) ([]domain.AdminUser, error)
	
	// Health check
	HealthCheck() error
}