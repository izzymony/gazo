package requests

import (
	"fmt"
)

type ShippingUser struct {
	FirstName         string `json:"firstname" binding:"required"`
	LastName          string `json:"lastname"`
	Phone             string `json:"phone" binding:"required"`
	Email             string `json:"email" binding:"required"`
	ShippingAddressID string `json:"shipping_address_id"`
}

type ShippingProfile struct {
	Street       string        `json:"street" binding:"required"`
	Town         string        `json:"town" binding:"required"`
	State        string        `json:"state" binding:"required"`
	Country      string        `json:"country" binding:"required"`
	ShippingUser *ShippingUser `json:"shipping_user"`
	IsDefault    bool          `json:"is_default"`
}

func (s ShippingProfile) GetFormatedAddress() string {
	return fmt.Sprintf("%s, %s, %s, %s", s.Street, s.Town, s.State, s.Country)
}

type ShippingOptionRequest struct {
	Street       string        `json:"street" binding:"required"`
	Town         string        `json:"town" binding:"required"`
	State        string        `json:"state" binding:"required"`
	Country      string        `json:"country" binding:"required"`
	ProductId    string        `json:"product_id" binding:"required"`
	Quantity     int           `json:"quantity" binding:"required"`
	ShippingUser *ShippingUser `json:"shipping_user"`
}

func (s ShippingOptionRequest) GetFormatedAddress() string {
	return fmt.Sprintf("%s, %s, %s, %s", s.Street, s.Town, s.State, s.Country)
}
