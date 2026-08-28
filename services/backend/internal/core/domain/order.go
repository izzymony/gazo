package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

const (
	INSTA = "insta"
)

// Order actions
const (
	CreateOrderAction = "order_created"
	UpdateOrderAction = "order_updated"
)

type Order struct {
	Model
	UserID            string           `json:"user_id"`
	User              *User            `json:"user,omitempty" gorm:"foreignKey:UserID;references:ID"`
	Invoice           string           `json:"invoice,omitempty"`
	SubTotal          float64          `json:"sub_total"`
	ShippingCost      float64          `json:"shipping_cost"`
	Total             float64          `json:"total"` // RW1: gross (product + shipping); NOT reduced by credit
	// RW1: platform-funded rewards-credit discount applied to this order (buyer
	// pays Total - CreditApplied; the seller still settles on full item price).
	// Set from the server-validated reserved amount, never the raw client value.
	CreditApplied     float64          `json:"credit_applied" gorm:"default:0"`
	PaymentMethod     string           `json:"payment_method" default:"cash"`
	PaymentReceipt    string           `json:"payment_receipt"`
	PaymentReceived   bool             `json:"payment_received" default:"false"`
	Items             []OrderItem      `json:"items" gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE"`
	ShippingProfileID string           `json:"shipping_profile_id"`
	ShippingProfile   *ShippingProfile `json:"shipping_profile,omitempty" gorm:"foreignKey:ShippingProfileID;references:ID"`
}

type OrderItem struct {
	Model
	OrderID          string         `json:"order_id" gorm:"index"`
	Order            Order          `json:"order" gorm:"foreignKey:OrderID;references:ID"`
	ProductID        string         `json:"product_id" gorm:"index"`
	Product          *Product       `json:"product,omitempty" gorm:"foreignKey:ProductID;references:ID"`
	BusinessID       string         `json:"business_id"`
	Business         Business       `json:"business" gorm:"foreignKey:BusinessID;references:ID"`
	Price            float64        `json:"price"`
	Quantity         int            `json:"quantity"`
	ShippingOptionID string         `json:"shipping_option_id"`
	ShippingOption   ShippingOption `json:"shipping_option" gorm:"foreignKey:ShippingOptionID;references:ID"`
	ShipmentID       string         `json:"shipment_id" gorm:"index"`
	Shipment         Shipment       `json:"shipment" gorm:"foreignKey:ShipmentID;references:ID"`
	Status           string         `json:"status"`
	BuyerActivity    MapArray       `json:"buyer_activity" gorm:"type:jsonb"`
	SellerActivity   MapArray       `json:"seller_activity" gorm:"type:jsonb"`
	VendorCredited   bool           `json:"vendor_credited" gorm:"default:false"`
	StatusUpdatedAt  time.Time      `json:"status_updated_at"`
	// Variant tracking for fulfillment (critical for sellers to know what was ordered)
	VariantSelection string         `json:"variant_selection,omitempty"` // e.g., "Red-Large"
	VariantData      MapArray       `json:"variant_data,omitempty" gorm:"type:jsonb"` // Full variant details
}

type OrderActivity struct {
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
	Details  string `json:"details"`
	Time     string `json:"time"`
}

func (c OrderItem) Value() (driver.Value, error) {
	// Convert the array of strings to JSON
	jsonValue, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}
	return jsonValue, nil
}

// Scan Implement the Scanner interface for TagArr (for retrieving the value)
func (c *OrderItem) Scan(value interface{}) error {
	var bytes []byte

	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("failed to scan value, expected string or []byte but got %T", value)
	}

	return json.Unmarshal(bytes, c)
}
