package requests

import (
	"time"
)

type ShipbubbleWebhookRequest struct {
	Event   string `json:"event"`
	OrderID string `json:"order_id"`
	Status  string `json:"status"`

	Courier struct {
		Name            string  `json:"name"`
		Email           string  `json:"email"`
		Phone           string  `json:"phone"`
		TrackingCode    string  `json:"tracking_code"`
		TrackingMessage string  `json:"tracking_message"`
		RiderInfo       *string `json:"rider_info"`
	} `json:"courier"`

	ShipFrom struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Email   string `json:"email"`
		Address string `json:"address"`
	} `json:"ship_from"`

	ShipTo struct {
		Name    string `json:"name"`
		Phone   string `json:"phone"`
		Email   string `json:"email"`
		Address string `json:"address"`
	} `json:"ship_to"`

	ToBeProcessed time.Time `json:"to_be_processed"`

	Payment struct {
		ShippingFee int    `json:"shipping_fee"`
		Currency    string `json:"currency"`
	} `json:"payment"`

	PackageStatus []struct {
		Status   string    `json:"status"`
		Datetime time.Time `json:"datetime"`
	} `json:"package_status"`

	Insurance       *string       `json:"insurance"`
	Events          []interface{} `json:"events"`
	DropoffStation  *string       `json:"dropoff_station"`
	PickupStation   *string       `json:"pickup_station"`
	TrackingURL     string        `json:"tracking_url"`
	WaybillDocument *string       `json:"waybill_document"`
	Date            time.Time     `json:"date"`
}

type PaystackWebhookRequest struct {
	Event string `json:"event"`
	Data  struct {
		Reference string `json:"reference"`
		Customer  struct {
			Email string `json:"email"`
		} `json:"customer"`
	} `json:"data"`
}

type TwilioMessageStatus struct {
	MessagingServiceSid string `form:"MessagingServiceSid"`
	ApiVersion          string `form:"ApiVersion"`
	MessageStatus       string `form:"MessageStatus"`
	SmsSid              string `form:"SmsSid"`
	SmsStatus           string `form:"SmsStatus"`
	To                  string `form:"To"`
	From                string `form:"From"`
	MessageSid          string `form:"MessageSid"`
	AccountSid          string `form:"AccountSid"`
}
