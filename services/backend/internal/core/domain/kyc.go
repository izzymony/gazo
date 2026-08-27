package domain

import "time"

type KYC struct {
	Model
	UserID       string `gorm:"index"`
	User         User   `gorm:"foreignKey:UserID" json:"user"`
	Document     string
	DocumentType string // nin | national_id | passport | drivers_license
	Selfie       string
	LegalName    string     // submitted full legal name (must match ID + payout account)
	BVN          string     // optional in v1; encrypted at rest (AES-GCM via helper.EncryptBVN) — never plaintext (R8/KYC1 §13)
	Status       string     // pending | approved | rejected
	Reason       string     // optional rejection reason
	ReviewedBy   string     // admin id (audit)
	ReviewedAt   *time.Time // when reviewed (audit)

	// Review aid (KYC1) — computed at admin request time, NEVER persisted (gorm:"-").
	// Compares the submitted LegalName against the seller's payout account name so the
	// admin can catch a mismatch before approving. See helper.NameMatchLevel.
	PayoutAccountName   string `gorm:"-" json:"payout_account_name,omitempty"`
	PayoutBankName      string `gorm:"-" json:"payout_bank_name,omitempty"`
	PayoutAccountMasked string `gorm:"-" json:"payout_account_masked,omitempty"`
	NameMatch           string `gorm:"-" json:"name_match,omitempty"` // match | partial | mismatch | no_account
}
