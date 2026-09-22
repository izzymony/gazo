package domain

import "time"

type WithdrawalRequest struct {
	Model
	UserID   string  `json:"user_id" gorm:"index"`
	WalletID string  `json:"wallet_id" gorm:"index"`
	Amount   float64 `json:"amount"`
	// One of the WithdrawalStatus constants in payout.go. Defaults to
	// `requested`: the seller has asked and `LockBalance` is holding the funds.
	Status               string                    `json:"status" gorm:"default:requested"`
	Reason               string                    `json:"reason"`
	BankAccountDetailsID string                    `json:"bank_account_details_id"`
	User                 User                      `json:"user" gorm:"foreignKey:UserID"`
	BankAccountDetail    BusinessBankAccountDetail `json:"bank_account" gorm:"foreignKey:BankAccountDetailsID"`
	Reference            string                    `json:"reference"`

	// ── Provider lifecycle ────────────────────────────────────────────────
	//
	// ProviderReference is the idempotency key. It is generated and COMMITTED
	// before the transfer call and reused on every retry, so Paystack dedupes
	// the transfer for us and a crash between claim and call can be resolved by
	// verifying this reference rather than guessing. Unique in the database.
	Provider             string `json:"provider"`
	ProviderReference    string `json:"provider_reference" gorm:"index"`
	ProviderTransferCode string `json:"provider_transfer_code" gorm:"index"`
	ProviderStatus       string `json:"provider_status"`
	FailureReason        string `json:"failure_reason"`
	// Paystack's fee for the transfer. Vibaar absorbs it, so it does not reduce
	// what the seller receives — it is recorded so the platform cost is visible
	// and switching to deducting it is a change of one calculation, not a
	// migration.
	TransferFee float64 `json:"transfer_fee"`
	// Bounded retries. Past the budget the withdrawal goes to `needs_review`
	// with its reservation still HELD, because an unknown outcome must never
	// release funds.
	AttemptCount int `json:"attempt_count"`

	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	ProcessingAt *time.Time `json:"processing_at,omitempty"`
	PaidAt       *time.Time `json:"paid_at,omitempty"`
	FailedAt     *time.Time `json:"failed_at,omitempty"`
	ReversedAt   *time.Time `json:"reversed_at,omitempty"`
}
