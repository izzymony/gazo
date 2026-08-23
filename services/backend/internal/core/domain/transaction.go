package domain

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
	Amount            float64 `json:"amount"`
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
}
