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

	// ProviderFeeKobo is Paystack's COLLECTION fee for this charge, in integer
	// kobo, as returned by verify.
	//
	// The fee was parsed off the verify response and thrown away, so the
	// gateway cost of every charge Vibaar has ever taken is unrecorded.
	//
	// NULLABLE, and that is the substance of it rather than a detail. NULL means
	// "we do not know what the fee was" — an old row, or a verify response that
	// carried none — while 0 means Paystack charged nothing. Collapsing the two
	// into a single 0 would make every historical row look like a free charge,
	// and the reconciliation that eventually reads this could not tell a gap
	// from a genuine zero.
	//
	// A NEW column rather than a repurposed `TransactionFee`. That field has no
	// writer, which makes reuse tempting, but its name and units are part of the
	// API response and of any query ever written against the table, and a
	// `float64` naira field silently becoming an `int64` kobo field is invisible
	// until a number is a hundred times too big.
	//
	// Kobo and int64 because that is what Paystack sends; there is no reason to
	// round-trip it through binary floating point on the way to a column.
	// `payment_fee_allocation` on the allocation record reads it later; it is a
	// platform cost and is never deducted from a seller.
	ProviderFeeKobo *int64 `json:"provider_fee_kobo"`
}
