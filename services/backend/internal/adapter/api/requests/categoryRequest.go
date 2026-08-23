package requests

type Category struct {
	Name               string  `json:"name"`
	Description        *string `json:"description,omitempty"`
	Slug               *string `json:"slug,omitempty"`
	Icon               *string `json:"icon,omitempty"`
	Status             string  `json:"status"`
	ExternalCategoryId string  `json:"external_category_id"`
	MinWeight          float64 `json:"min_weight"`
	MaxWeight          float64 `json:"max_weight"`
}

type SubCategory struct {
	Name          string  `json:"name"`
	Description   *string `json:"description,omitempty"`
	Slug          *string `json:"slug,omitempty"`
	Icon          *string `json:"icon,omitempty"`
	Status        string  `json:"status"`
	CategoryId    string  `json:"category_id"`
	DefaultWeight float64 `json:"default_weight"`
	DefaultLength float64 `json:"default_length"`
	DefaultWidth  float64 `json:"default_width"`
	DefaultHeight float64 `json:"default_height"`
}
