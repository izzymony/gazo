package domain

import (
	"time"
)

const (
	ADMIN_USER    = "ADMIN"
	CUSTOMER_USER = "CUSTOMER"
)

type User struct {
	Firstname         string    `json:"firstname"`
	Lastname          string    `json:"lastname"`
	Email             string    `json:"email" gorm:"unique"`
	UserName          string    `json:"user_name" gorm:"unique"`
	Phone             string    `json:"phone" gorm:"unique"`
	Password          string    `json:"password"`
	Recommendations   string    `json:"recommendations"`
	InstagramID       string    `json:"instagram_id"`
	TiktokID          string    `json:"tiktok_id"`
	AuthType          string    `json:"auth_type"`
	InstagramUsername string    `json:"instagram_username"`
	TiktokUsername    string    `json:"tiktok_username"`
	DateOfBirth       time.Time `json:"date_of_birth"`
	ProfileImage      string    `json:"profile_image"`
	Business          *Business `json:"business" gorm:"foreignKey:UserID;references:ID"`

	// Referral system fields
	ReferredByUsername  string  `json:"referred_by_username,omitempty" gorm:"index"`        // Referrer's username
	ReferralActivated   bool    `json:"referral_activated" gorm:"default:false"`            // True after first order
	ShoppingCredit      float64 `json:"shopping_credit" gorm:"default:0"`                   // Non-withdrawable credit
	WithdrawableCredit  float64 `json:"withdrawable_credit" gorm:"default:0"`               // Can withdraw to wallet
	TotalReferralEarned float64 `json:"total_referral_earned" gorm:"default:0"`             // Lifetime referral earnings
	TotalWithdrawn      float64 `json:"total_withdrawn" gorm:"default:0"`                   // Amount already withdrawn

	Model
}
