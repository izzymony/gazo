package requests

type Product struct {
	Title       string   `json:"title" validate:"required"`
	Description string   `json:"description,omitempty"`
	SKU         *string  `json:"sku,omitempty"`
	Barcode     *string  `json:"barcode,omitempty"`
	Slug        string   `json:"slug"`
	Image       []string `json:"image,omitempty"`
	Stock       *int     `json:"stock,omitempty"`
	Sales       *int     `json:"sales,omitempty"`
	Tag         []string `json:"tag,omitempty"`
	Variants    []struct {
		Name            string            `json:"name,omitempty"`
		Status          string            `json:"status,omitempty" validate:"oneof=show hide" default:"show"`
		Types           []string          `json:"types"`
		// Custom properties for advanced variant management
		OwnedProperties []string          `json:"owned_properties,omitempty"`
		PriceValues     map[string]int    `json:"price_values,omitempty"`
		StockValues     map[string]int    `json:"stock_values,omitempty"`
		ImageValues     map[string]string `json:"image_values,omitempty"`
	} `json:"variants,omitempty"`
	IsCombination bool   `json:"is_combination"`
	Status        string `json:"status"`
	CategoryID    string `json:"category_id" validate:"required"`
	SubCategoryID string `json:"sub_category_id" validate:"required"`
	Price         struct {
		OldPrice float64 `json:"old_price"`
		Price    float64 `json:"price" validate:"gt=0"`
	} `json:"price"`
	CollectionIDs []string `json:"collection_ids"`
	Weight              float64                       `json:"weight"`
	Length              float64                       `json:"length"`
	Width               float64                       `json:"width"`
	Height              float64                       `json:"height"`
	// VariantCombinations removed - backend calculates combinations on-demand from variants
}

type RecentlyViewedProduct struct {
	ProductIds []string `json:"product_ids"`
}
