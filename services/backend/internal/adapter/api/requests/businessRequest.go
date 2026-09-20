package requests

type Business struct {
	UserID                    string                      `json:"user_id"`
	Name                      string                      `json:"name" binding:"required"`
	Tag                       string                      `json:"tag" binding:"required"`
	Phone                     string                      `json:"phone" gorm:"index" binding:"required"`
	Email                     string                      `json:"email" gorm:"index" binding:"required"`
	Category                  string                      `json:"category"`
	Logo                      string                      `json:"logo"`
	
	// Social Media Profiles
	InstagramProfile          *string                     `json:"instagram_profile"`
	TiktokProfile            *string                     `json:"tiktok_profile"`
	FacebookProfile          *string                     `json:"facebook_profile"`
	WhatsappProfile          *string                     `json:"whatsapp_profile"`
	XProfile                 *string                     `json:"x_profile"`
	
	Address                   *BusinessAddress            `json:"address" binding:"required"`
	BusinessSetting           *BusinessSetting            `json:"business_setting"`
	BusinessBankAccountDetail []BusinessBankAccountDetail `json:"business_bank_account_detail"`
}

type BusinessAddress struct {
	Country        string  `json:"country"`
	Area           *string `json:"province"`
	AddressLine    string  `json:"address_line"`
	AddressLineTwo *string `json:"address_line_two"`
}

type BusinessSetting struct {
	ShippingAmount float64 `json:"shipping_amount"`
	ShippingType   string  `json:"shipping_type"`
}

type BusinessBankAccountDetail struct {
	Bank          string `json:"bank"`
	AccountNumber string `json:"account_number"`
	AccountName   string `json:"account_name"`
	BankCode      string `json:"bank_code"` // string: leading zeros are significant — see domain.BusinessBankAccountDetail
	IsDefault     bool   `json:"is_default"`
}

type RecentlyViewedBusiness struct {
	BusinessIds []string `json:"business_ids"`
}

type CreateDiscount struct {
	Type           string   `json:"type"`
	Title          string   `json:"title"`
	Code           string   `json:"code"`
	DiscountType   string   `json:"discount_type"`
	Amount         float64  `json:"amount"`
	ApplyTo        string   `json:"apply_to"`
	ProductIDs     []string `json:"product_ids"`
	MinRequirement struct {
		Enabled   bool   `json:"enabled"`
		Type      string `json:"type"`
		Threshold int    `json:"threshold"`
	} `json:"min_requirement"`
	Limit struct {
		Enabled       bool   `json:"enabled"`
		Type          string `json:"type"`
		LimitPerValue int    `json:"limit_value"`
	} `json:"limit"`
	ValidFrom string `json:"valid_from"`
	ValidTo   string `json:"valid_to"`
}
