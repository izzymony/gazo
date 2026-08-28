package domain

import "time"

const (
	STATUS_FAILED = "failed"
)

type Transaction struct {
	Model
	Reference         string  `json:"reference"` // order invoice
	ExternalReference string  `json:"external_reference"`
	UserId            string  `json:"user_id"`
	Sender            string  `json:"sender"`
	Recipient         string  `json:"receipient"`
	Amount            float64 `json:"amount"` // RW1: the CASH charged (gross Total minus reserved credit)
	Currency          string  `json:"currency" gorm:"default:NGN"`
	Status            string  `json:"status" gorm:"default:pending"`
	TransactionFee    float64 `json:"transaction_fee" gorm:"default:0"`
	GatewayType       string  `json:"gateway_type" gorm:"default:paystack"`
	Channel           string  `json:"channel" gorm:"default:web"`
	Metadata          Map     `json:"meta_data"`
	PaymentType       string  `json:"payment_type" gorm:"default:credit"`
	// Payload holds the validated order (a requests.Order, JSON) for the
	// order-on-success flow: the order is created FROM this on charge.success, so
	// a failed/abandoned payment leaves no order. Empty on the legacy order-first
	// path (Verify then falls back to finding the already-created order).
	Payload Map `json:"payload,omitempty"`

	// RW1 rewards-credit reservation (order-on-success path only). The buyer's
	// applied credit is HELD (balance decremented) at InitiateCheckout, per bucket,
	// and either CONVERTED (order created) or RELEASED (payment failed/expired),
	// each exactly once. CreditConvertedAt / CreditReleasedAt are the idempotency
	// guards. Amount above = gross Total minus (reserved shopping + withdrawable).
	CreditReservedShopping     float64    `json:"credit_reserved_shopping" gorm:"default:0"`
	CreditReservedWithdrawable float64    `json:"credit_reserved_withdrawable" gorm:"default:0"`
	CreditConvertedAt          *time.Time `json:"credit_converted_at,omitempty"`
	CreditReleasedAt           *time.Time `json:"credit_released_at,omitempty"`
}
