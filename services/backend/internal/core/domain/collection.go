package domain

type Collection struct {
	Model
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Slug        string  `json:"slug"`
	BusinessID  string  `json:"business_id" gorm:"index"`
}
