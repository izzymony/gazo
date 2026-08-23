package domain

type WithdrawalRequest struct {
	Model
	UserID               string  `json:"user_id" gorm:"index"`
	WalletID             string  `json:"wallet_id" gorm:"index"`
	Amount               float64 `json:"amount"`
	Status               string  `json:"status" gorm:"default:pending"` // pending, approved, rejected
	Reason               string  `json:"reason"`
	BankAccountDetailsID string                    `json:"bank_account_details_id"`
	User                 User                      `json:"user" gorm:"foreignKey:UserID"`
	BankAccountDetail    BusinessBankAccountDetail `json:"bank_account" gorm:"foreignKey:BankAccountDetailsID"`
	Reference            string                    `json:"reference"`
}
