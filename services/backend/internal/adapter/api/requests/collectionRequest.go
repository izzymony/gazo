package requests

type Collection struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}
