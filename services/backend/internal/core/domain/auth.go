package domain

type AuthToken struct {
	AccessToken string   `json:"access_token"`
	Permissions []string `json:"permissions"`
	UserId      int64    `json:"user_id"`
}

type OauthUser struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Avatar      string `json:"avatar"`
	DisplayName string `json:"display_name"`
}
