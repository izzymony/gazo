package domain

type VerificationCode struct {
	Model
	UUID       string `gorm:"not null"`
	Used       *bool  `gorm:"not null"`
	Type       string
	Identifier string `json:"identifier"`
}
