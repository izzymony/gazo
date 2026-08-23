package domain

import "time"

type OTP struct {
	Model
	Identifier  string        `json:"identifier" binding:"required" gorm:"not null"`
	Duration    time.Duration `json:"duration"`
	RequestType string        `json:"request_type" binding:"required"`
	Code        string        `json:"code"`
	Status      string        `json:"status" gorm:"default:NOT_EXPIRED; not null"`
}
