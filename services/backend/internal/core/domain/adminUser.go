package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// JSON is a custom type for JSON data that implements sql.Scanner and driver.Valuer
type JSON map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into JSON", value)
	}
	
	return json.Unmarshal(bytes, j)
}

// AdminUser represents an admin user in the system
type AdminUser struct {
	ID                   string                 `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email                string                 `json:"email" gorm:"unique;not null"`
	PasswordHash         string                 `json:"-" gorm:"column:password_hash;not null"`
	Name                 string                 `json:"name" gorm:"not null"`
	Role                 string                 `json:"role" gorm:"not null;default:operations"`
	Permissions          JSON                   `json:"permissions" gorm:"type:jsonb;default:'{}'"`
	MFASecret            *string                `json:"-" gorm:"column:mfa_secret"`
	IsActive             bool                   `json:"is_active" gorm:"default:true"`
	LastLoginAt          *time.Time             `json:"last_login_at"`
	LastLoginIP          *string                `json:"last_login_ip" gorm:"type:inet"`
	PasswordChangedAt    time.Time              `json:"password_changed_at" gorm:"default:now()"`
	FailedLoginAttempts  int                    `json:"failed_login_attempts" gorm:"default:0"`
	LockedUntil          *time.Time             `json:"locked_until"`
	CreatedAt            time.Time              `json:"created_at" gorm:"default:now()"`
	UpdatedAt            time.Time              `json:"updated_at" gorm:"default:now()"`
}

// TableName sets the table name for AdminUser model
func (AdminUser) TableName() string {
	return "admin_users"
}

// AdminSession represents an admin session
type AdminSession struct {
	ID        string     `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AdminID   string     `json:"admin_id" gorm:"not null"`
	TokenHash string     `json:"-" gorm:"unique;not null"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null"`
	IPAddress *string    `json:"ip_address" gorm:"type:inet"`
	UserAgent *string    `json:"user_agent"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time  `json:"created_at" gorm:"default:now()"`
	Admin     *AdminUser `json:"admin,omitempty" gorm:"foreignKey:AdminID;references:ID"`
}

// TableName sets the table name for AdminSession model
func (AdminSession) TableName() string {
	return "admin_sessions"
}

// AdminAuditLog represents an audit log entry for admin actions
type AdminAuditLog struct {
	ID           string                 `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AdminID      *string                `json:"admin_id"`
	AdminEmail   string                 `json:"admin_email"`
	Action       string                 `json:"action" gorm:"not null"`
	ResourceType string                 `json:"resource_type" gorm:"not null"`
	ResourceID   *string                `json:"resource_id" gorm:"type:uuid"`
	Details      JSON                   `json:"details" gorm:"type:jsonb;default:'{}'"`
	IPAddress    *string                `json:"ip_address" gorm:"type:inet"`
	UserAgent    *string                `json:"user_agent"`
	Status       string                 `json:"status" gorm:"default:success"`
	CreatedAt    time.Time              `json:"created_at" gorm:"default:now()"`
	Admin        *AdminUser             `json:"admin,omitempty" gorm:"foreignKey:AdminID;references:ID"`
}

// TableName sets the table name for AdminAuditLog model
func (AdminAuditLog) TableName() string {
	return "admin_audit_logs"
}

// AdminRole represents a predefined admin role
type AdminRole struct {
	ID          string                 `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Name        string                 `json:"name" gorm:"unique;not null"`
	DisplayName string                 `json:"display_name" gorm:"not null"`
	Description *string                `json:"description"`
	Permissions JSON                   `json:"permissions" gorm:"type:jsonb;not null;default:'{}'"`
	IsActive    bool                   `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time              `json:"created_at" gorm:"default:now()"`
	UpdatedAt   time.Time              `json:"updated_at" gorm:"default:now()"`
}

// TableName sets the table name for AdminRole model
func (AdminRole) TableName() string {
	return "admin_roles"
}

// AdminNotification represents a notification for admin users
type AdminNotification struct {
	ID        string                 `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	AdminID   string                 `json:"admin_id" gorm:"not null"`
	Type      string                 `json:"type" gorm:"not null"`
	Title     string                 `json:"title" gorm:"not null"`
	Message   string                 `json:"message" gorm:"not null"`
	Data      JSON                   `json:"data" gorm:"type:jsonb;default:'{}'"`
	IsRead    bool                   `json:"is_read" gorm:"default:false"`
	Priority  string                 `json:"priority" gorm:"default:normal"`
	ExpiresAt *time.Time             `json:"expires_at"`
	CreatedAt time.Time              `json:"created_at" gorm:"default:now()"`
	Admin     *AdminUser             `json:"admin,omitempty" gorm:"foreignKey:AdminID;references:ID"`
}

// TableName sets the table name for AdminNotification model
func (AdminNotification) TableName() string {
	return "admin_notifications"
}

// AdminAuthResponse represents the response after successful admin authentication
type AdminAuthResponse struct {
	AdminID     string                 `json:"admin_id"`
	Email       string                 `json:"email"`
	Name        string                 `json:"name"`
	Role        string                 `json:"role"`
	Permissions JSON                   `json:"permissions"`
	Token       string                 `json:"token"`
	ExpiresAt   time.Time              `json:"expires_at"`
}

// AdminProfile represents public admin profile information
type AdminProfile struct {
	ID          string                 `json:"id"`
	Email       string                 `json:"email"`
	Name        string                 `json:"name"`
	Role        string                 `json:"role"`
	Permissions JSON                   `json:"permissions"`
	IsActive    bool                   `json:"is_active"`
	LastLoginAt *time.Time             `json:"last_login_at"`
	CreatedAt   time.Time              `json:"created_at"`
}