package mysql_repo

import (
	"crypto/sha256"
	"encoding/hex"
	"time"

	"gorm.io/gorm"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/ports"
)

type AdminAuthRepository struct {
	db *gorm.DB
}

func NewAdminAuthRepository(db *gorm.DB) ports.AdminAuthInterface {
	return &AdminAuthRepository{
		db: db,
	}
}

// Admin User Operations
func (r *AdminAuthRepository) CreateAdminUser(adminUser *domain.AdminUser) error {
	return r.db.Create(adminUser).Error
}

func (r *AdminAuthRepository) GetAdminUserByEmail(email string) (*domain.AdminUser, error) {
	var adminUser domain.AdminUser
	err := r.db.Where("email = ? AND is_active = ?", email, true).First(&adminUser).Error
	if err != nil {
		return nil, err
	}
	return &adminUser, nil
}

func (r *AdminAuthRepository) GetAdminUserByID(id string) (*domain.AdminUser, error) {
	var adminUser domain.AdminUser
	err := r.db.Where("id = ?", id).First(&adminUser).Error
	if err != nil {
		return nil, err
	}
	return &adminUser, nil
}

func (r *AdminAuthRepository) UpdateAdminUser(adminUser *domain.AdminUser) error {
	return r.db.Save(adminUser).Error
}

func (r *AdminAuthRepository) UpdateAdminPassword(adminID string, hashedPassword string) error {
	return r.db.Model(&domain.AdminUser{}).
		Where("id = ?", adminID).
		Updates(map[string]interface{}{
			"password_hash":      hashedPassword,
			"password_changed_at": time.Now(),
			"updated_at":         time.Now(),
		}).Error
}

func (r *AdminAuthRepository) IncrementFailedLoginAttempts(adminID string) error {
	return r.db.Model(&domain.AdminUser{}).
		Where("id = ?", adminID).
		UpdateColumn("failed_login_attempts", gorm.Expr("failed_login_attempts + 1")).Error
}

func (r *AdminAuthRepository) ResetFailedLoginAttempts(adminID string) error {
	return r.db.Model(&domain.AdminUser{}).
		Where("id = ?", adminID).
		Updates(map[string]interface{}{
			"failed_login_attempts": 0,
			"last_login_at":         time.Now(),
			"locked_until":          nil,
		}).Error
}

func (r *AdminAuthRepository) LockAdminAccount(adminID string, lockDuration time.Duration) error {
	lockUntil := time.Now().Add(lockDuration)
	return r.db.Model(&domain.AdminUser{}).
		Where("id = ?", adminID).
		Update("locked_until", lockUntil).Error
}

// Session Operations
func (r *AdminAuthRepository) CreateSession(session *domain.AdminSession) error {
	// Hash the token before storing
	hasher := sha256.New()
	hasher.Write([]byte(session.TokenHash))
	session.TokenHash = hex.EncodeToString(hasher.Sum(nil))
	
	return r.db.Create(session).Error
}

func (r *AdminAuthRepository) GetSessionByTokenHash(tokenHash string) (*domain.AdminSession, error) {
	// Hash the provided token for comparison
	hasher := sha256.New()
	hasher.Write([]byte(tokenHash))
	hashedToken := hex.EncodeToString(hasher.Sum(nil))
	
	var session domain.AdminSession
	err := r.db.Preload("Admin").
		Where("token_hash = ? AND is_active = ? AND expires_at > ?", hashedToken, true, time.Now()).
		First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *AdminAuthRepository) InvalidateSession(tokenHash string) error {
	// Hash the provided token for comparison
	hasher := sha256.New()
	hasher.Write([]byte(tokenHash))
	hashedToken := hex.EncodeToString(hasher.Sum(nil))
	
	return r.db.Model(&domain.AdminSession{}).
		Where("token_hash = ?", hashedToken).
		Update("is_active", false).Error
}

func (r *AdminAuthRepository) InvalidateAllUserSessions(adminID string) error {
	return r.db.Model(&domain.AdminSession{}).
		Where("admin_id = ?", adminID).
		Update("is_active", false).Error
}

func (r *AdminAuthRepository) CleanupExpiredSessions() error {
	return r.db.Where("expires_at < ? OR is_active = ?", time.Now(), false).
		Delete(&domain.AdminSession{}).Error
}

// Audit Log Operations
func (r *AdminAuthRepository) CreateAuditLog(auditLog *domain.AdminAuditLog) error {
	return r.db.Create(auditLog).Error
}

func (r *AdminAuthRepository) GetAuditLogs(page, limit int, adminID, action, resourceType, startDate, endDate string) ([]domain.AdminAuditLog, int64, error) {
	var auditLogs []domain.AdminAuditLog
	var total int64
	
	query := r.db.Model(&domain.AdminAuditLog{}).Preload("Admin")
	
	// Apply filters
	if adminID != "" {
		query = query.Where("admin_id = ?", adminID)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	if startDate != "" {
		startTime, err := time.Parse("2006-01-02", startDate)
		if err == nil {
			query = query.Where("created_at >= ?", startTime)
		}
	}
	if endDate != "" {
		endTime, err := time.Parse("2006-01-02", endDate)
		if err == nil {
			// Add 24 hours to include the entire end date
			endTime = endTime.Add(24 * time.Hour)
			query = query.Where("created_at <= ?", endTime)
		}
	}
	
	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&auditLogs).Error; err != nil {
		return nil, 0, err
	}
	
	return auditLogs, total, nil
}

// Role Operations
func (r *AdminAuthRepository) GetRoleByName(name string) (*domain.AdminRole, error) {
	var role domain.AdminRole
	err := r.db.Where("name = ? AND is_active = ?", name, true).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

func (r *AdminAuthRepository) GetAllActiveRoles() ([]domain.AdminRole, error) {
	var roles []domain.AdminRole
	err := r.db.Where("is_active = ?", true).Order("display_name").Find(&roles).Error
	return roles, err
}

// Notification Operations
func (r *AdminAuthRepository) CreateNotification(notification *domain.AdminNotification) error {
	return r.db.Create(notification).Error
}

func (r *AdminAuthRepository) CreateBulkNotifications(notifications []domain.AdminNotification) error {
	return r.db.CreateInBatches(notifications, 100).Error
}

func (r *AdminAuthRepository) GetUnreadNotificationCount(adminID string) (int64, error) {
	var count int64
	err := r.db.Model(&domain.AdminNotification{}).
		Where("admin_id = ? AND is_read = ? AND (expires_at IS NULL OR expires_at > ?)", 
			adminID, false, time.Now()).
		Count(&count).Error
	return count, err
}

func (r *AdminAuthRepository) GetNotificationsByAdminID(adminID string, page, limit int) ([]domain.AdminNotification, int64, error) {
	var notifications []domain.AdminNotification
	var total int64
	
	query := r.db.Model(&domain.AdminNotification{}).
		Where("admin_id = ? AND (expires_at IS NULL OR expires_at > ?)", adminID, time.Now())
	
	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	
	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&notifications).Error; err != nil {
		return nil, 0, err
	}
	
	return notifications, total, nil
}

func (r *AdminAuthRepository) MarkNotificationAsRead(notificationID string) error {
	return r.db.Model(&domain.AdminNotification{}).
		Where("id = ?", notificationID).
		Update("is_read", true).Error
}

func (r *AdminAuthRepository) MarkAllNotificationsAsRead(adminID string) error {
	return r.db.Model(&domain.AdminNotification{}).
		Where("admin_id = ? AND is_read = ?", adminID, false).
		Update("is_read", true).Error
}

func (r *AdminAuthRepository) GetAdminsByRole(role string) ([]domain.AdminUser, error) {
	var admins []domain.AdminUser
	err := r.db.Where("role = ? AND is_active = ?", role, true).Find(&admins).Error
	return admins, err
}

func (r *AdminAuthRepository) GetAdminsByRoles(roles []string) ([]domain.AdminUser, error) {
	var admins []domain.AdminUser
	err := r.db.Where("role IN ? AND is_active = ?", roles, true).Find(&admins).Error
	return admins, err
}

// Health check operations
func (r *AdminAuthRepository) HealthCheck() error {
	var result int
	return r.db.Raw("SELECT 1").Scan(&result).Error
}