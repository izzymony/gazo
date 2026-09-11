package requests

type SignUpRequest struct {
	Firstname         string `json:"firstname" binding:"required"`
	Lastname          string `json:"lastname"`
	UserName          string `json:"user_name" binding:"required"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	Password          string `json:"password"`
	InstagramID       string `json:"instagram_id"`
	InstagramUsername string `json:"instagram_username"`
	AuthType          string `json:"auth_type" binding:"required"`
	OTP               string `json:"otp" binding:"required"`
	// Optional guest order linking fields
	GuestOrderID string `json:"guest_order_id,omitempty"`
	GuestID      string `json:"guest_id,omitempty"`
	// Optional referral username during signup
	ReferralUsername string `json:"referral_username,omitempty"`
}

// UpdateUserRequest is bound from BOTH JSON and multipart/form-data (the avatar
// submit). Gin maps a multipart body by the `form` tag and falls back to the Go
// FIELD NAME when it is absent — so without these tags every field bound empty,
// `binding:"required"` on Firstname failed, and every avatar change 400'd with
// "invalid request". The file itself is NOT bound here (`form:"-"`): a file
// cannot map onto a string, so the handler uploads it and sets the URL.
type UpdateUserRequest struct {
	Firstname        string `json:"firstname" form:"firstname" binding:"required"`
	Lastname         string `json:"lastname" form:"lastname"`
	Username         string `json:"username" form:"username"`
	PhoneNumber      string `json:"phone_number" form:"phone_number"`
	DateOfBirth      string `json:"date_of_birth" form:"date_of_birth"`
	ProfileImage     string `json:"profile_image" form:"-"`
	ReferralUsername string `json:"referral_username,omitempty" form:"referral_username"` // Optional referral code during profile completion
}

type LoginRequest struct {
	Identifier   string `json:"identifier"`
	Password     string `json:"Password"`
	GuestOrderID string `json:"guest_order_id,omitempty"`
	GuestID      string `json:"guest_id,omitempty"`
}

type ForgotPassword struct {
	Indentifier string `json:"indentifier" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
	Code        string `json:"code" binding:"required"`
}

type ChangePassword struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
	UserID      string `json:"user_id"`
}

type ReviewKYC struct {
	Status string `json:"status" binding:"required,oneof=approved rejected"`
	Reason string `json:"reason"`
}
