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

		// `transfer.*` events only. The reference is ours (we set it when
		// initiating); the transfer code is Paystack's. Either can identify the
		// withdrawal, which matters because a transfer created by an older
		// build may predate our reference.
		TransferCode string `json:"transfer_code"`
		Status       string `json:"status"`
		Amount       int64  `json:"amount"`
		// Paystack sends `fee_charged` on the transfer object — verified against a
		// real transfer, whose keys contain `fee_charged` and no `fee` at all.
		// `Fee` stays as a fallback; a silently-zero fee is invisible.
		FeeCharged int64 `json:"fee_charged"`
		Fee        int64 `json:"fee"`
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

// TransferFee returns whichever fee field the transfer payload carried.
//
// Paystack sends `fee_charged`; `fee` is read as a fallback so a payload
// shape we have not seen does not silently record a zero fee.
func (r PaystackWebhookRequest) TransferFee() int64 {
	if r.Data.FeeCharged != 0 {
		return r.Data.FeeCharged
	}
	return r.Data.Fee
}
