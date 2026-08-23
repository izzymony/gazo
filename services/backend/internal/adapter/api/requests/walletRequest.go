package requests

type WithdrawalRequest struct {
	Amount                       float64 `json:"amount" binding:"required"`
	BusinessBankAccountDetailsID string  `json:"bank_account_details_id"`
	Otp                          string  `json:"otp" binding:"required"`
}
