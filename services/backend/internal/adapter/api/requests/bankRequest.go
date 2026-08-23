package requests

type AccountDetails struct {
	AccountNumber string
	AccountName   string
	BankCode      string
}

type BankRequest struct {
	AccountNumber string `json:"account_number" binding:"required"`
	BankCode      string `json:"bank_code" binding:"required"`
}
