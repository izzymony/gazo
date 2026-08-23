package domain

import (
	"time"
)

type Discount struct {
	Model
	BusinessID   string     `json:"business_id" gorm:"index"`
	Type         string     `json:"type"` // coupon_code, buy_x_get_x_free
	Title        string     `json:"title"`
	Code         string     `json:"code"`
	DiscountType string     `json:"discount_type"` // percentage, fixed
	Amount       float64    `json:"amount"`
	ApplyTo      string     `json:"apply_to"` // store, products
	Products     []*Product `json:"products" gorm:"many2many:discount_products;"`
	MinEnabled   bool       `json:"min_enabled"`
	MinType      string     `json:"min_type"` // price, count
	MinThreshold int        `json:"min_threshold"`
	LimitEnabled bool       `json:"limit_enabled"`
	LimitType    string     `json:"limit_type"` // total_usage, customer_usage
	LimitValue   int        `json:"limit_value"`
	ValidFrom    time.Time  `json:"valid_from"`
	ValidTo      time.Time  `json:"valid_to"`
}
