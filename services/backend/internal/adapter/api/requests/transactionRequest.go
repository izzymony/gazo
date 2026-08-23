package requests

type InitiateTransaction struct {
	OrderType   string  `json:"order_type"`
	Amount      float64 `json:"amount" validate:"required"`
	Invoice     string  `json:"invoice" validate:"required"`
	RedirectURL string  `json:"redirect_url" validate:"required"`
	Email       string  `json:"email"`
}

type VerifyTransaction struct {
	Reference string `json:"reference" validate:"required"`
}

// InitiateCheckout is the order-on-success payload: the order fields (embedded)
// plus payment metadata. The order is validated + stored on the transaction and
// created only on charge.success — a failed payment leaves no order.
type InitiateCheckout struct {
	Order
	RedirectURL string `json:"redirect_url" validate:"required"`
	Email       string `json:"email"`
}
