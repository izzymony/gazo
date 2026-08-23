package requests

import "time"

// AdminLoginRequest represents the request payload for admin login
type AdminLoginRequest struct {
	Email    string `json:"email" binding:"required,email" example:"admin@instashop.com"`
	Password string `json:"password" binding:"required,min=6" example:"password123"`
	Remember bool   `json:"remember" example:"false"`
}

// UpdateAdminProfileRequest represents the request payload for updating admin profile
type UpdateAdminProfileRequest struct {
	Name  string `json:"name,omitempty" binding:"omitempty,min=2,max=255" example:"John Doe"`
	Email string `json:"email,omitempty" binding:"omitempty,email" example:"admin@instashop.com"`
}

// ChangeAdminPasswordRequest represents the request payload for changing admin password
type ChangeAdminPasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required,min=6" example:"oldpassword123"`
	NewPassword     string `json:"new_password" binding:"required,min=8" example:"newpassword123"`
	ConfirmPassword string `json:"confirm_password" binding:"required,eqfield=NewPassword" example:"newpassword123"`
}

// AdminUserCreateRequest represents the request payload for creating new admin user
type AdminUserCreateRequest struct {
	Email       string                 `json:"email" binding:"required,email" example:"admin@instashop.com"`
	Name        string                 `json:"name" binding:"required,min=2,max=255" example:"John Doe"`
	Role        string                 `json:"role" binding:"required,oneof=super_admin admin operations support financial" example:"operations"`
	Permissions map[string]interface{} `json:"permissions,omitempty" example:"{}"`
	Password    string                 `json:"password" binding:"required,min=8" example:"password123"`
	IsActive    bool                   `json:"is_active" example:"true"`
}

// AdminUserUpdateRequest represents the request payload for updating admin user
type AdminUserUpdateRequest struct {
	Name        string                 `json:"name,omitempty" binding:"omitempty,min=2,max=255" example:"John Doe"`
	Role        string                 `json:"role,omitempty" binding:"omitempty,oneof=super_admin admin operations support financial" example:"operations"`
	Permissions map[string]interface{} `json:"permissions,omitempty" example:"{}"`
	IsActive    *bool                  `json:"is_active,omitempty" example:"true"`
}

// AdminUserListRequest represents the request parameters for listing admin users
type AdminUserListRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1" example:"1"`
	Limit    int    `form:"limit" binding:"omitempty,min=1,max=100" example:"20"`
	Role     string `form:"role" binding:"omitempty,oneof=super_admin admin operations support financial" example:"operations"`
	IsActive *bool  `form:"is_active" example:"true"`
	Search   string `form:"search" example:"john"`
}

// AdminNotificationRequest represents the request payload for creating admin notifications
type AdminNotificationRequest struct {
	AdminID   string                 `json:"admin_id,omitempty" example:"uuid"`
	Type      string                 `json:"type" binding:"required,oneof=system_alert user_action_required security_warning" example:"system_alert"`
	Title     string                 `json:"title" binding:"required,min=1,max=255" example:"System Maintenance"`
	Message   string                 `json:"message" binding:"required,min=1" example:"System will be under maintenance"`
	Data      map[string]interface{} `json:"data,omitempty" example:"{}"`
	Priority  string                 `json:"priority" binding:"omitempty,oneof=low normal high critical" example:"normal"`
	ExpiresAt *time.Time             `json:"expires_at,omitempty" example:"2024-12-31T23:59:59Z"`
}

// BulkAdminNotificationRequest represents the request payload for sending bulk notifications
type BulkAdminNotificationRequest struct {
	AdminIDs  []string               `json:"admin_ids,omitempty" example:"[\"uuid1\", \"uuid2\"]"`
	Roles     []string               `json:"roles,omitempty" binding:"omitempty,dive,oneof=super_admin admin operations support financial" example:"[\"admin\", \"operations\"]"`
	Type      string                 `json:"type" binding:"required,oneof=system_alert user_action_required security_warning" example:"system_alert"`
	Title     string                 `json:"title" binding:"required,min=1,max=255" example:"System Maintenance"`
	Message   string                 `json:"message" binding:"required,min=1" example:"System will be under maintenance"`
	Data      map[string]interface{} `json:"data,omitempty" example:"{}"`
	Priority  string                 `json:"priority" binding:"omitempty,oneof=low normal high critical" example:"normal"`
	ExpiresAt *time.Time             `json:"expires_at,omitempty" example:"2024-12-31T23:59:59Z"`
}

// AdminRoleRequest represents the request payload for creating/updating admin roles
type AdminRoleRequest struct {
	Name         string                 `json:"name" binding:"required,min=2,max=50" example:"custom_role"`
	DisplayName  string                 `json:"display_name" binding:"required,min=2,max=100" example:"Custom Role"`
	Description  string                 `json:"description,omitempty" example:"Custom role description"`
	Permissions  map[string]interface{} `json:"permissions" binding:"required" example:"{}"`
	IsActive     bool                   `json:"is_active" example:"true"`
}

// UpdateShippingStatusRequest represents the request payload for admin manual shipping status update
type UpdateShippingStatusRequest struct {
	Status string `json:"status" binding:"required" example:"completed"`
	Reason string `json:"reason" binding:"required" example:"Webhook failed, verified with customer"`
	Notes  string `json:"notes" example:"Customer confirmed delivery via phone"`
}