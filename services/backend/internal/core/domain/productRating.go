package domain

type ProductRating struct {
	Model
	ProductID string  `json:"product_id"`
	UserID    string  `json:"user_id"`
	Comment   string  `json:"comment"`
	Rate      float32 `json:"rate"`
	IsBlocked bool    `json:"is_blocked"`
}
