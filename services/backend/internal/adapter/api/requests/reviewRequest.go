package requests

type CreateReviewRequest struct {
	TaskID  string  `json:"task_id"`
	Rating  float32 `json:"rating"`
	UserID  string  `json:"user_id"`
	Comment string  `json:"comment"`
}


type UpdateReviewRequest struct {
	TaskID  string  `json:"task_id"`
	Rating  float32 `json:"rating"`
	UserID  string  `json:"user_id"`
	Comment string  `json:"comment"`
}
