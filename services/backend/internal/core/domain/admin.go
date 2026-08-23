package domain

type Admin struct {
	Model
	Email    string `json:"email"`
	Password string `json:"password"`
}
