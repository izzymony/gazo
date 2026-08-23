package requests

type Order struct {
	Invoice  string  `json:"invoice,omitempty"`
	SubTotal float64 `json:"sub_total" validate:"required"`
	Total    float64 `json:"total" validate:"required"`
	// PaymentMethod string          `json:"payment_method" validate:"required" default:"cash"`
	Status            string `json:"status" `
	Items             []Item `json:"cart"`
	ShippingProfileID string `json:"shipping_profile_id" validate:"required"`
}

type Item struct {
	ProductID        string                 `json:"product_id"`
	Price            float64                `json:"price"`
	Quantity         int                    `json:"quantity"`
	ShippingOptionID string                 `json:"shipping_option_id"`
	// Variant tracking - optional for products with variants
	VariantSelection string                 `json:"variant_selection,omitempty"` // e.g., "Red-Large"
	VariantData      map[string]interface{} `json:"variant_data,omitempty"`      // Full variant details
}
