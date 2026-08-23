package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// ZoneRate is a seller's Self-delivery rate + delivery-time estimate for one
// destination zone. Eta is a preset label (e.g. "1-2 days") shown to the buyer.
type ZoneRate struct {
	Enabled bool    `json:"enabled"`
	Rate    float64 `json:"rate"`
	Eta     string  `json:"eta"`
}

// SelfZones holds a seller's Self-delivery flat rates by destination zone.
// Local is required (always enabled); Interstate and International are optional.
// Stored as a JSON column on business_setting. The two-source options/shipment
// branching that reads this is built in shipping design phase D — this type +
// column is the foundation (P3).
type SelfZones struct {
	Local         ZoneRate `json:"local"`
	Interstate    ZoneRate `json:"interstate"`
	International  ZoneRate `json:"international"`
}

// Value implements driver.Valuer so SelfZones persists as JSON.
func (z SelfZones) Value() (driver.Value, error) {
	b, err := json.Marshal(z)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

// Scan implements sql.Scanner. A NULL column (legacy rows before backfill)
// leaves the zero value.
func (z *SelfZones) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("failed to scan SelfZones, expected string or []byte but got %T", value)
	}
	if len(bytes) == 0 {
		return nil
	}
	return json.Unmarshal(bytes, z)
}

type Business struct {
	Model
	UserID             string                      `json:"user_id"`
	Name               string                      `json:"name" gorm:"index;unique"`
	Tag                string                      `json:"tag"`
	Phone              string                      `json:"phone" gorm:"index"`
	Email              string                      `json:"email" gorm:"index"`
	Category           string                      `json:"category"`
	Logo               string                      `json:"logo"`
	
	// Social Media Profiles
	InstagramProfile   *string                     `json:"instagram_profile"`
	TiktokProfile      *string                     `json:"tiktok_profile"`
	FacebookProfile    *string                     `json:"facebook_profile"`
	WhatsappProfile    *string                     `json:"whatsapp_profile"`
	XProfile          *string                     `json:"x_profile"`
	
	Address            *BusinessAddress            `json:"address" gorm:"foreignKey:BusinessID"`
	BusinessSetting    *BusinessSetting            `json:"business_setting" gorm:"foreignKey:BusinessID"`
	BankAccountDetails []BusinessBankAccountDetail `json:"bank_account_details" gorm:"foreignKey:BusinessID"`
	OrderCount         int64                       `gorm:"-" json:"order_count"`

	// KYC / trust layer (KYC1). Denormalised onto Business so the buyer-facing
	// Verified badge and the ₦100k withdrawal gate are O(1) checks. IsVerified /
	// KYCStatus are written only at admin review time; LifetimeSales is incremented
	// by the wallet release cron when settled funds move to available.
	IsVerified    bool    `json:"is_verified" gorm:"default:false"`
	KYCStatus     string  `json:"kyc_status" gorm:"default:unverified"` // unverified | pending | verified | rejected
	LifetimeSales float64 `json:"lifetime_sales" gorm:"default:0"`
}

type BusinessBankAccountDetail struct {
	Model
	Bank          string   `json:"bank"`
	AccountNumber string   `json:"account_number"`
	AccountName   string   `json:"account_name"`
	BankCode      int      `json:"bank_code"`
	BusinessID    string   `json:"business_id" gorm:"index"`
	IsDefault     bool     `json:"is_default"`
	Metadata      MapArray `json:"metadata" gorm:"type:jsonb"`
}

type BusinessAddress struct {
	Model
	Country               string  `json:"country"`
	Area                  *string `json:"province" gorm:"column:area"`
	AddressLine           string  `json:"address_line"`
	AddressLineTwo        *string `json:"address_line_two"`
	BusinessID            string  `json:"business_id" gorm:"index"`
	ShipbubbleAddressCode int     `json:"shipbubble_address_code"`
}

type BusinessSetting struct {
	Model
	// Legacy single-source fields — kept readable during the transition to the
	// two-source model. ShippingType values migrated INSTA -> PARTNER.
	ShippingAmount float64 `json:"shipping_amount"`
	ShippingType   string  `json:"shipping_type"`
	// Two-source delivery config (P3 foundation; branching lands in phase D):
	// Partner (Shipbubble) couriers on/off, and Self-delivery flat rates by zone.
	PartnerEnabled       bool                 `json:"partner_enabled" gorm:"default:true"`
	SelfZones            SelfZones            `json:"self_zones" gorm:"type:jsonb"`
	BusinessID           string               `json:"business_id" gorm:"index"`
	PersonalisedSettings PersonalisedSettings `json:"personalised_settings" gorm:"embedded"`
}

type PersonalisedSettings struct {
	Model
	BackgroundImage   string `json:"background_image"`
	BackgroundColor   string `json:"background_color"`
	BackgroundState   string `json:"background_state" gorm:"default:color"`
	BackgroundPattern string `json:"background_pattern"`
}

type RecentlyViewedBusiness struct {
	Model
	BusinessID string    `json:"business_id"`
	UserID     string    `json:"user_id"`
	Business   Business  `json:"business" gorm:"foreignKey:BusinessID;constraint:OnDelete:CASCADE"`
	Products   []Product `json:"products" gorm:"foreignKey:BusinessID;references:BusinessID"`
}

type Customer struct {
	ID           string    `json:"id"`
	Firstname    string    `json:"firstname"`
	Lastname     string    `json:"lastname"`
	UserName     string    `json:"user_name"`
	ProfileImage string    `json:"profile_image"`
	TotalOrders  int       `json:"total_orders"`
	TotalSpent   int       `json:"total_spent"`
	LastPurchase time.Time `json:"last_purchase"`
	State        string    `json:"state"`
	IsNew        bool      `json:"is_new"`
}

type AnalyticsResponse struct {
	Summary       map[string]int     `json:"summary"`
	PercentChange map[string]float64 `json:"percent_change"`
}

type Follower struct {
	Model
	BusinessID string   `json:"business_id"`
	UserID     string   `json:"user_id"`
	User       User     `json:"user" gorm:"foreignKey:UserID;references:ID"`
	Business   Business `json:"business" gorm:"foreignKey:BusinessID;references:ID"`
}

type StoreAnalyticsResponse struct {
	Ratings          float32 `json:"ratings"`
	ProductsSold     int64   `json:"products_sold"`
	FollowersCount   int64   `json:"followers_count"`
	AvgOrderPrepTime float32 `json:"avg_order_prep_time"`
	AvgDeliveryTime  int64   `json:"avg_delivery_time"`
	FulfilmentRate   int64   `json:"fulfilment_rate"`
}
