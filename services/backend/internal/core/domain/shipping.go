package domain

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

type ShippingProfile struct {
	Model
	Street                string       `json:"street"`
	Town                  string       `json:"town"`
	State                 string       `json:"state"`
	Country               string       `json:"country"`
	Longitude             float64      `json:"longitude"`
	Latitude              float64      `json:"latitude"`
	UserID                string       `json:"user_id"`
	ShippingUser          ShippingUser `json:"shipping_user" gorm:"foreignKey:ShippingProfileID;"`
	IsDefault             bool         `json:"is_default"`
	ShipbubbleAddressCode int          `json:"shipbubble_address_code"`
}

type ShippingUser struct {
	Model
	FirstName         string `json:"firstname"`
	LastName          string `json:"lastname"`
	Phone             string `json:"phone"`
	Email             string `json:"email"`
	ShippingProfileID string `json:"shipping_profile_id"`
}

type ShippingOption struct {
	Model
	Provider          string   `json:"provider"`      // e.g shipbubble
	ProviderID        string   `json:"provider_id"`   // provider unique id e.g shipbubble request_token
	ProviderData      MapArray `json:"provider_data"` // option data from the provider
	DeliveryType      string   `json:"delivery_type"` // express, fast & standard
	Description       string   `json:"description"`
	DeliveryDaysRange string   `json:"delivery_days"`
	Price             string   `json:"price"`
}

func (p *ShippingOption) ParsePrice() (float64, error) {
	var numericPart strings.Builder
	for _, r := range p.Price {
		if unicode.IsDigit(r) || r == '.' {
			numericPart.WriteRune(r)
		}
	}
	price, err := strconv.ParseFloat(numericPart.String(), 64)
	if err != nil {
		return 0, fmt.Errorf("invalid price format: %v", err)
	}
	return price, nil
}

type Shipment struct {
	Model
	Provider     string   `json:"provider"`
	ProviderData MapArray `json:"provider_data"`
	ProviderID   string   `json:"provider_id"` // provider unique id e.g shipbubble order id
	OrderID      string   `json:"order_id"`
	Order        Order    `json:"order" gorm:"foreignKey:OrderID;references:ID"`
}
