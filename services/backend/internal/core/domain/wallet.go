package domain

type Wallet struct {
	Model
	UserID             string   `json:"user_id" gorm:"index"`
	BusinessID         string   `json:"business_id" gorm:"index"`
	Business           Business `json:"business" gorm:"foreignKey:BusinessID"`
	AvailableBalance   float64  `json:"available_balance"`
	TotalEarnings      float64  `json:"total_earnings"`
	ClearingBalance    float64  `json:"clearing_balance"`
	OrdersInProgress   float64  `json:"orders_in_progress"`
	PendingWithdrawals float64  `json:"pending_withdrawals" gorm:"default:0"`
	Status             string   `json:"status" gorm:"default:'active'"`
	TotalWithdrawn     float64  `json:"total_withdrawn"`
}

type WalletTransaction struct {
	Model
	WalletID          string   `json:"wallet_id" gorm:"index"`
	Type              string   `json:"type"`
	TypeDescription   string   `json:"type_description"`
	Amount            float64  `json:"amount"`
	Reference         string   `json:"reference"` // internal reference
	ExternalReference string   `json:"external_reference"`
	BalanceBefore     float64  `json:"balance_before"`
	BalanceAfter      float64  `json:"balance_after"`
	Status            string   `json:"status" gorm:"default:pending"`
	Beneficiary       string   `json:"beneficiary"`
	Metadata          MapArray `json:"metadata" gorm:"type:jsonb"`
	From              string   `json:"from"`
	To                string   `json:"to"`

	// The money split, recorded per entry rather than derived later.
	//
	// Deriving a historical seller payout from whatever the commission rate
	// happens to be at read time silently rewrites history the first time the
	// rate changes. Storing it means a statement printed in a year still shows
	// what was actually agreed. Launch is 0% commission, so today
	// PlatformFee is 0 and SellerNet equals GrossAmount — the fields exist so
	// that introducing a fee is a change to one calculation, not a backfill of
	// records whose true value is no longer knowable.
	GrossAmount float64 `json:"gross_amount"`
	PlatformFee float64 `json:"platform_fee"`
	SellerNet   float64 `json:"seller_net"`
}
