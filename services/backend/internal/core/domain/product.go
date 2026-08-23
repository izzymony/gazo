package domain

type Product struct {
	Model
	SKU           *string         `json:"sku,omitempty"`
	Weight        float64         `json:"weight"`
	Barcode       *string         `json:"barcode,omitempty"`
	Title         string          `json:"title"`
	Description   string          `json:"description,omitempty"`
	Slug          string          `json:"slug"`
	Category      Category        `json:"category"`
	Collections   []Collection    `json:"collections" gorm:"many2many:product_collections;"`
	SubCategory   SubCategory     `json:"sub_category"`
	Image         StrArray        `json:"image,omitempty" gorm:"type:jsonb"`
	Stock         *int            `json:"stock,omitempty"`
	Sales         *int            `json:"sales,omitempty"`
	Tag           StrArray        `json:"tag,omitempty" gorm:"type:jsonb"`
	Variants            []Variant           `json:"variants,omitempty" gorm:"foreignKey:ProductID"`
	// VariantCombinations removed - backend calculates combinations on-demand from variants
	IsCombination       bool                `json:"is_combination"`
	Status        string          `json:"status"`
	CategoryID    string          `json:"category_id" gorm:"index"`
	CollectionIDs StrArray        `json:"collection_ids,omitempty" gorm:"type:jsonb"`
	SubCategoryID string          `json:"sub_category_id" gorm:"index"`
	UserID        string          `json:"user_id" gorm:"index"`
	BusinessID    string          `json:"business_id" gorm:"index"`
	Length        float64         `json:"length"`
	Width         float64         `json:"width"`
	Height        float64         `json:"height"`
	OldPrice      float64         `json:"old_price"`
	Price         float64         `json:"price"`
	// Shipping dimensions for Shipbubble integration
	ExternalCategoryId string  `json:"external_category_id" gorm:"index"`
	ShippingLengthCm   float64 `json:"shipping_length_cm"`
	ShippingWidthCm    float64 `json:"shipping_width_cm"`
	ShippingHeightCm   float64 `json:"shipping_height_cm"`
	ShippingWeightKg   float64 `json:"shipping_weight_kg"`
	ProductRating []ProductRating `json:"product_rating" gorm:"foreignKey:ProductID"`
	Discounts     []*Discount     `json:"discounts" gorm:"many2many:discount_products;"`
}

type Variant struct {
	Model
	Name            string                 `json:"name,omitempty"`
	Status          string                 `json:"status,omitempty" validate:"oneof=show hide" default:"show"`
	Types           StrArray               `json:"types" gorm:"type:jsonb"`
	ProductID       string                 `json:"product_id" gorm:"index"`
	// Custom properties for advanced variant management
	OwnedProperties StrArray               `json:"owned_properties,omitempty" gorm:"type:jsonb;default:'[]'"`
	PriceValues     map[string]int         `json:"price_values,omitempty" gorm:"type:jsonb;serializer:json;default:'{}'"`
	StockValues     map[string]int         `json:"stock_values,omitempty" gorm:"type:jsonb;serializer:json;default:'{}'"`
	ImageValues     map[string]string      `json:"image_values,omitempty" gorm:"type:jsonb;serializer:json;default:'{}'"`
}

type ProductWishlist struct {
	Model
	ProductID string  `json:"product_id"`
	UserID    string  `json:"user_id"`
	Product   Product `json:"product" gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE"`
}

type RecentlyViewedProduct struct {
	Model
	ProductID string  `json:"product_id"`
	UserID    string  `json:"user_id"`
	Product   Product `json:"product" gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE"`
}

// VariantCombination removed - backend calculates combinations on-demand from variants

type ProductRanking struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Slug        string   `json:"slug"`
	Image       StrArray `json:"image,omitempty" gorm:"type:jsonb"`
	TotalOrders int      `json:"total_orders"`
	TotalViews  int      `json:"total_views"`
	TotalSales  int      `json:"total_sales"`
	Stock       int      `json:"stock"`
}
