package requests

type WithdrawalRequest struct {
	// `required` alone rejects 0 — the float zero value — but happily accepts
	// -1000, which used to pass both balance checks and then DECREMENT the
	// reservation. `gt=0` is the HTTP-layer half; the service enforces it again,
	// because this struct is not the only way into RequestWithdrawal.
	Amount                       float64 `json:"amount" binding:"required,gt=0"`
	BusinessBankAccountDetailsID string  `json:"bank_account_details_id"`
	Otp                          string  `json:"otp" binding:"required"`
}
