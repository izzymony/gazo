package domain

type Category struct {
	Model
	Name                 string        `json:"name"`
	Description          *string       `json:"description,omitempty"`
	Slug                 *string       `json:"slug,omitempty"`
	Icon                 *string       `json:"icon,omitempty"`
	Status               string        `json:"status"`
	ExternalCategoryId   string        `json:"external_category_id"`
	ShipbubbleCategoryId *string       `json:"shipbubble_category_id,omitempty"`
	ShipbubbleProviderId *string       `json:"shipbubble_provider_id,omitempty"`
	MinWeight            float64       `json:"min_weight"`
	MaxWeight            float64       `json:"max_weight"`
	SubCategories        []SubCategory `json:"sub_categories" gorm:"foreignKey:CategoryId"` // Association
}

type SubCategory struct {
	Model
	Name                   string  `json:"name"`
	Description            *string `json:"description,omitempty"`
	Slug                   *string `json:"slug,omitempty"`
	Icon                   *string `json:"icon,omitempty"`
	Status                 string  `json:"status"`
	CategoryId             string  `json:"category_id" gorm:"index"`
	DefaultWeight          float64 `json:"default_weight"`
	DefaultLength          float64 `json:"default_length"`
	DefaultWidth           float64 `json:"default_width"`
	DefaultHeight          float64 `json:"default_height"`
	RequiresCustomShipping bool    `json:"requires_custom_shipping" gorm:"default:false"`
}

type ExternalCategory struct {
	Model
	Name       string `json:"name"`
	Provider   string `json:"provider"`
	ProviderId string `json:"provider_id"`
}

type CategorySearchResult struct {
	Categories    []Category
	SubCategories []SubCategory
}
