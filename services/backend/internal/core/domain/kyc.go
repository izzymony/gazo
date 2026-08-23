package domain

import "time"

type KYC struct {
	Model
	UserID       string `gorm:"index"`
	User         User   `gorm:"foreignKey:UserID" json:"user"`
	Document     string
	DocumentType string     // nin | national_id | passport | drivers_license
	Selfie       string
	LegalName    string     // submitted full legal name (must match ID + payout account)
	BVN          string     // optional in v1; store hashed/tokenised, never plaintext (KYC1 §13)
	Status       string     // pending | approved | rejected
	Reason       string     // optional rejection reason
	ReviewedBy   string     // admin id (audit)
	ReviewedAt   *time.Time // when reviewed (audit)
}
