package domain

type Context struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	UserName   string `json:"user_name"`
	Phone      string `json:"phone"`
	BusinessID string `json:"business_id"`
}
