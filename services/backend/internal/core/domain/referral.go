package domain

import (
	"time"
)

// Referral system constants
const (
	SignupBonusAmount         = 1000.0 // ₦1,000 for new users (shopping credit only)
	ReferralBonusAmount       = 500.0  // ₦500 for referrers (split 50/50)
	ReferralBonusShopping     = 250.0  // ₦250 shopping credit portion
	ReferralBonusWithdrawable = 250.0  // ₦250 withdrawable portion
	MaxCreditUsagePercent     = 0.5    // 50% of order max
	MinWithdrawalThreshold    = 10000.0 // Min ₦10,000 total earned to withdraw
	WithdrawalPercent         = 0.5    // 50% of referral earnings withdrawable
)

// Credit entry types
const (
	CreditTypeSignupBonus               = "signup_bonus"
	CreditTypeReferralBonusShopping     = "referral_bonus_shopping"
	CreditTypeReferralBonusWithdrawable = "referral_bonus_withdrawable"
	CreditTypePendingReferralBonus      = "pending_referral_bonus" // Pending credit for referrer until referee completes first order
	CreditTypeWithdrawal                = "withdrawal"
	CreditTypeUsage                     = "usage"
	CreditTypeManualAdjustment          = "manual_adjustment"
)

// Credit entry sources
const (
	CreditSourceSignup             = "signup"              // Universal signup bonus
	CreditSourceReferralActivation = "referral_activation" // Referral-related credits
	CreditSourceWithdrawal         = "withdrawal"
	CreditSourceCheckout           = "checkout"
	CreditSourceAdmin              = "admin"
)

// CreditEntry tracks all credit transactions for audit trail
type CreditEntry struct {
	Model
	UserID      string     `json:"user_id" gorm:"index;not null"`
	Amount      float64    `json:"amount" gorm:"not null"`
	Remaining   float64    `json:"remaining" gorm:"default:0"`
	Type        string     `json:"type" gorm:"not null"`                    // signup_bonus, referral_bonus_shopping, referral_bonus_withdrawable, withdrawal, usage
	Source      string     `json:"source" gorm:"not null"`                  // referral_activation, withdrawal, checkout, admin
	RefereeID   string     `json:"referee_id,omitempty" gorm:"index"`       // Who was referred (for referrer's record)
	ReferrerID  string     `json:"referrer_id,omitempty" gorm:"index"`      // Who referred (for referee's record)
	OrderID     string     `json:"order_id,omitempty" gorm:"index"`         // Activation order or usage order
	UsedAt      *time.Time `json:"used_at,omitempty"`
	Description string     `json:"description,omitempty" gorm:"type:text"` // Human-readable description
}

// ReferralInfo represents the referral information returned to users
type ReferralInfo struct {
	ReferralID             string  `json:"referral_id"` // User's referral ID (their username)
	ReferralLink           string  `json:"referral_link"`
	ShoppingCredit         float64 `json:"shopping_credit"`
	WithdrawableCredit     float64 `json:"withdrawable_credit"`
	TotalCredit            float64 `json:"total_credit"`
	PendingEarnings        float64 `json:"pending_earnings"`          // Pending referral earnings (not yet converted)
	TotalReferrals         int64   `json:"total_referrals"`
	ActivatedReferrals     int64   `json:"activated_referrals"`
	PendingReferrals       int64   `json:"pending_referrals"`
	TotalEarned            float64 `json:"total_earned"`
	TotalWithdrawn         float64 `json:"total_withdrawn"`
	AvailableToWithdraw    float64 `json:"available_to_withdraw"`
	MinWithdrawalThreshold float64 `json:"min_withdrawal_threshold"`
	CanWithdraw            bool    `json:"can_withdraw"`
	WithdrawalMessage      string  `json:"withdrawal_message,omitempty"`
	MaxUsagePercent        int     `json:"max_usage_percent"`
	ReferredBy             string  `json:"referred_by,omitempty"`
	ReferralActivated      bool    `json:"referral_activated"`
}

// ReferralStats represents admin statistics for the referral program
type ReferralStats struct {
	TotalSignupsWithReferral int64               `json:"total_signups_with_referral"`
	TotalCreditsIssued       float64             `json:"total_credits_issued"`
	TotalCreditsUsed         float64             `json:"total_credits_used"`
	TotalCreditsOutstanding  float64             `json:"total_credits_outstanding"`
	TotalWithdrawn           float64             `json:"total_withdrawn"`
	TopReferrers             []TopReferrerInfo   `json:"top_referrers"`
	SignupsThisMonth         int64               `json:"signups_this_month"`
	CreditsUsedThisMonth     float64             `json:"credits_used_this_month"`
}

// TopReferrerInfo represents a top referrer's summary
type TopReferrerInfo struct {
	Username  string  `json:"username"`
	Referrals int64   `json:"referrals"`
	Earned    float64 `json:"earned"`
}

// ReferralUserInfo represents user info with referral data for admin
type ReferralUserInfo struct {
	ID                   string    `json:"id"`
	Username             string    `json:"username"`
	Email                string    `json:"email"`
	ShoppingCredit       float64   `json:"shopping_credit"`
	WithdrawableCredit   float64   `json:"withdrawable_credit"`
	TotalReferralEarned  float64   `json:"total_referral_earned"`
	TotalWithdrawn       float64   `json:"total_withdrawn"`
	ReferredByUsername   string    `json:"referred_by_username,omitempty"`
	ReferralActivated    bool      `json:"referral_activated"`
	TotalReferrals       int64     `json:"total_referrals"`
	ActivatedReferrals   int64     `json:"activated_referrals"`
	CreatedAt            time.Time `json:"created_at"`
}
