package requests

// SetReferrerRequest is used when setting a referral code during profile completion
type SetReferrerRequest struct {
	ReferralUsername string `json:"referral_username" binding:"required"`
}

// ValidateReferralRequest is used to validate a referral code
type ValidateReferralRequest struct {
	ReferralUsername string `json:"referral_username" binding:"required"`
}

// WithdrawCreditRequest is used when withdrawing credit to wallet
type WithdrawCreditRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
}

// UseCreditRequest is used when applying credit at checkout
type UseCreditRequest struct {
	Amount     float64 `json:"amount" binding:"required,gt=0"`
	OrderTotal float64 `json:"order_total" binding:"required,gt=0"`
	OrderID    string  `json:"order_id" binding:"required"`
}

// AdminCreditAdjustmentRequest is used by admin for manual credit adjustments
type AdminCreditAdjustmentRequest struct {
	UserID     string  `json:"user_id" binding:"required"`
	Amount     float64 `json:"amount" binding:"required"`
	CreditType string  `json:"credit_type" binding:"required,oneof=shopping withdrawable"`
	Reason     string  `json:"reason" binding:"required"`
}
