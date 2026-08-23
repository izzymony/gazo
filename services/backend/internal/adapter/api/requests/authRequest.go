package requests

type InitiateSocialAuth struct {
	Provider    string `json:"provider" binding:"required"`
	RedirectURL string `json:"redirect_url" binding:"required"`
}
