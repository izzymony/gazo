package shipping

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
)

type ShipbubbleService struct {
	apiKey  string
	baseURL string
	// mock gates the fabricated courier options. It comes from the RESOLVED
	// configuration, so "are mocks allowed" is answered once, at construction,
	// by the same code that decides the base URL and the key.
	mock bool
}

// ErrNoCouriers reports that Shipbubble returned no courier for this route.
//
// It is a legitimate answer, not a fault — the route may simply be unserviced —
// and the caller's job is to degrade to the seller's own delivery, or to tell
// the buyer there is no delivery option. What it must NOT do is invent one.
var ErrNoCouriers = errors.New("no couriers available for this route")

func NewShipbubbleService() *ShipbubbleService {
	cfg, errs := ResolveConfig(os.Getenv)

	// The configuration is validated at BOOT (see ValidateConfig, wired into
	// main), so reaching here with errors means the process was started without
	// that gate — a test, or a code path that bypassed it. Say so once, without
	// the key and without failing the constructor, which has no way to report.
	for _, e := range errs {
		logger.Error("shipbubble configuration: " + e.Error())
	}

	// Which VARIABLE supplied the key, never the key. An earlier version of
	// this line printed the credential in full on every boot, which put a live
	// Shipbubble key into Render's retained logs.
	logger.Info(fmt.Sprintf("shipbubble configured: base_url=%s key_var=%s key_present=%t mock=%t",
		cfg.BaseURL, cfg.KeyVar, cfg.APIKey != "", cfg.Mock))

	return NewShipbubbleServiceWithConfig(cfg)
}

// NewShipbubbleServiceWithConfig builds a client from an explicit
// configuration, so the base URL and — crucially — whether fabricated courier
// options are permitted are stated by the caller rather than read from the
// environment.
//
// It exists because "mocks only when Mock is true" is a property worth testing
// directly, and reaching it through environment variables makes the test assert
// the env plumbing rather than the behaviour.
func NewShipbubbleServiceWithConfig(cfg Config) *ShipbubbleService {
	return &ShipbubbleService{
		apiKey:  cfg.APIKey,
		baseURL: cfg.BaseURL,
		mock:    cfg.Mock,
	}
}

// ValidateAddress registers a delivery address with Shipbubble and returns its
// address code.
//
// The address itself is never logged. It is the customer's home.
func (s *ShipbubbleService) ValidateAddress(data ShipbubbleAddressInfo) (*ShipbubbleResponseData, error) {
	var result ShipbubbleResponse
	if err := s.do("validate_address", http.MethodPost, "/shipping/address/validate", data, &result); err != nil {
		return nil, err
	}
	return &result.Data, nil
}

// FetchShippingRates asks Shipbubble for courier options.
//
// A zero-courier response is a legitimate answer — the route may be unserviced —
// so it returns normally and the caller degrades to the seller's own delivery.
// It used to log the entire request payload and the whole response on that
// branch, which is where receiver names, addresses and phone numbers reached
// the logs most often.
func (s *ShipbubbleService) FetchShippingRates(data FetchRatesRequest) (*FetchRatesResponse, error) {
	var result FetchRatesResponse
	if err := s.do("fetch_rates", http.MethodPost, "/shipping/fetch_rates", data, &result); err != nil {
		return nil, err
	}
	if len(result.Data.Couriers) == 0 {
		// The FACT, and nothing from the response. Shipbubble's `message` on a
		// no-coverage reply echoes the submitted addresses back, so recording it
		// — even truncated — puts the buyer's street into the logs. Truncation
		// shortens PII; it does not remove it.
		logger.Info("shipbubble fetch_rates returned no couriers")
	}
	return &result, nil
}

// GetRatesResponse maps Shipbubble's couriers to shipping options.
//
// Zero couriers returns ErrNoCouriers OUTSIDE mock mode, and that is the whole
// point of this function's contract. It used to return `getMockOptions()`
// unconditionally: two fabricated couriers — "Mock Express Delivery" at ₦2,500
// with `request_token: "mock_request_token_express"` — presented to the buyer as
// real choices. On staging and production that is a delivery service that does
// not exist, priced and charged for, and the booking would then fail at
// CreateShipment with a request token Shipbubble has never seen. The buyer has
// already paid by then.
//
// The gate is the RESOLVED config's Mock flag, not an env read: one place
// decides, at construction, and a test can construct either.
func (s *ShipbubbleService) GetRatesResponse(response *FetchRatesResponse, addressCode int) ([]GetRatesResponse, error) {
	couriers := response.Data.Couriers

	if len(couriers) == 0 {
		if s.mock {
			// Local development against the mock endpoint, where there is no
			// real provider to ask and no buyer to mislead.
			return getMockOptions(), nil
		}
		return nil, ErrNoCouriers
	}

	// Effective price = the discounted amount when a discount applies, else the
	// rate-card amount — show/charge what the buyer actually pays.
	effPrice := func(c Courier) float64 {
		if c.Discount.Discounted > 0 {
			return c.Discount.Discounted
		}
		return c.RateCardAmount
	}

	// Return the REAL couriers — one option each, no synthetic express/fast/
	// standard collapse and no discarded ETA. Cheapest first; the client re-sorts.
	sorted := make([]Courier, len(couriers))
	copy(sorted, couriers)
	sort.SliceStable(sorted, func(i, j int) bool {
		return effPrice(sorted[i]) < effPrice(sorted[j])
	})

	rates := make([]GetRatesResponse, 0, len(sorted))
	for _, courier := range sorted {
		deliveryDays := courier.DeliveryETA
		if deliveryDays == "" {
			deliveryDays = courier.DeliveryETATime
		}
		rates = append(rates, GetRatesResponse{
			DeliveryType: courier.CourierName,
			// Real couriers carry no marketing blurb; the ETA lives in
			// DeliveryDaysRange, and the redesigned card (D-C) reads the rich
			// fields from provider_data. Leave description empty rather than
			// surface a raw eta-time number.
			Description:       "",
			DeliveryDaysRange: deliveryDays,
			Price:             FormatPrice(courier.Currency, effPrice(courier)),
			ProviderData:      s.ConvertCourierToProviderData(courier, addressCode),
		})
	}

	return rates, nil
}

// CreateShipment books a label.
//
// The payload carries both parties' names, addresses, phones and emails, and the
// response carries the courier's contact details; neither is logged.
func (s *ShipbubbleService) CreateShipment(payload CreateShipmentRequest) (*CreateShipmentResponse, error) {
	var result CreateShipmentResponse
	if err := s.do("create_shipment", http.MethodPost, "/shipping/labels", payload, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

type CreateShipmentResponse struct {
	Status  string                     `json:"status"`
	Message string                     `json:"message"`
	Data    CreateShipmentResponseData `json:"data"`
}

type CreateShipmentResponseData struct {
	OrderID string `json:"order_id"`
	Courier struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Phone string `json:"phone"`
	} `json:"courier"`
	Status   string `json:"status"`
	ShipFrom struct {
		Name      string  `json:"name"`
		Phone     string  `json:"phone"`
		Email     string  `json:"email"`
		Address   string  `json:"address"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"ship_from"`
	ShipTo struct {
		Name      string  `json:"name"`
		Phone     string  `json:"phone"`
		Email     string  `json:"email"`
		Address   string  `json:"address"`
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	} `json:"ship_to"`
	Payment struct {
		ShippingFee float64 `json:"shipping_fee"`
		Type        string  `json:"type"`
		Status      string  `json:"status"`
		Currency    string  `json:"currency"`
	} `json:"payment"`
	Items []struct {
		Name        interface{} `json:"name"`
		Description interface{} `json:"description"`
		Weight      interface{} `json:"weight"`
		Amount      interface{} `json:"amount"`
		Quantity    interface{} `json:"quantity"`
		Total       interface{} `json:"total"`
	} `json:"items"`
	TrackingURL string `json:"tracking_url"`
	Date        string `json:"date"`
}

type CreateShipmentRequest struct {
	RequestToken string `json:"request_token"`
	ServiceCode  string `json:"service_code"`
	CourierID    string `json:"courier_id"`
	// InsuranceCode string `json:"insurance_code" default:""`
}

type GetRatesResponse struct {
	DeliveryType      string      `json:"delivery_type"` // express, fast & standard
	Description       string      `json:"description"`
	DeliveryDaysRange string      `json:"delivery_days"`
	Price             string      `json:"price"`
	ProviderData      interface{} `json:"provider_data"`
}

func (s *ShipbubbleService) ConvertCourierToProviderData(courier Courier, addressCode int) domain.MapArray {
	return domain.MapArray{
		{
			"courier_id":       courier.CourierID,
			"courier_name":     courier.CourierName,
			"courier_image":    courier.CourierImage,
			"service_code":     courier.ServiceCode,
			"rate_card_amount": courier.RateCardAmount,
			"insurance": map[string]interface{}{
				"code": courier.Insurance.Code,
				"fee":  courier.Insurance.Fee,
			},
			"discount": map[string]interface{}{
				"percentage": courier.Discount.Percentage,
				"symbol":     courier.Discount.Symbol,
				"discounted": courier.Discount.Discounted,
			},
			"service_type": courier.ServiceType,
			"address_code": addressCode,
			// Speed-tag + trust-badge inputs for the buyer options card (Shipping D).
			// Additive: previously dropped here, so the UI could not show real ETA,
			// same-day/COD/tracking. Behaviour-preserving — extra keys only.
			"delivery_eta":      courier.DeliveryETA,
			"delivery_eta_time": courier.DeliveryETATime,
			"on_demand":         courier.OnDemand,
			"is_cod_available":  courier.IsCODAvailable,
			"tracking_level":    courier.TrackingLevel,
			"currency":          courier.Currency,
		},
	}
}

func (s *ShipbubbleService) ConvertOrderToProviderData(shipment CreateShipmentResponseData) domain.MapArray {
	return domain.MapArray{
		{
			"order_id": shipment.OrderID,
			"courier": map[string]interface{}{
				"name":  shipment.Courier.Name,
				"email": shipment.Courier.Email,
				"phone": shipment.Courier.Phone,
			},
			"status": shipment.Status,
			"ship_from": map[string]interface{}{
				"name":      shipment.ShipFrom.Name,
				"phone":     shipment.ShipFrom.Phone,
				"email":     shipment.ShipFrom.Email,
				"address":   shipment.ShipFrom.Address,
				"latitude":  shipment.ShipFrom.Latitude,
				"longitude": shipment.ShipFrom.Longitude,
			},
			"ship_to": map[string]interface{}{
				"name":      shipment.ShipTo.Name,
				"phone":     shipment.ShipTo.Phone,
				"email":     shipment.ShipTo.Email,
				"address":   shipment.ShipTo.Address,
				"latitude":  shipment.ShipTo.Latitude,
				"longitude": shipment.ShipTo.Longitude,
			},
			"payment": map[string]interface{}{
				"shipping_fee": shipment.Payment.ShippingFee,
				"type":         shipment.Payment.Type,
				"status":       shipment.Payment.Status,
				"currency":     shipment.Payment.Currency,
			},
			"items": func() []map[string]interface{} {
				var items []map[string]interface{}
				for _, item := range shipment.Items {
					items = append(items, map[string]interface{}{
						"name":        item.Name,
						"description": item.Description,
						"weight":      item.Weight,
						"amount":      item.Amount,
						"quantity":    item.Quantity,
						"total":       item.Total,
					})
				}
				return items
			}(),
			"tracking_url": shipment.TrackingURL,
			"date":         shipment.Date,
		},
	}
}

// formatWithCommas formats a number with thousand separators
// Example: 5338 → "5,338"
func formatWithCommas(amount float64) string {
	str := fmt.Sprintf("%.0f", amount)

	var result strings.Builder
	for i, digit := range str {
		if i > 0 && (len(str)-i)%3 == 0 {
			result.WriteRune(',')
		}
		result.WriteRune(digit)
	}

	return result.String()
}

// mapCurrencyCode converts Shipbubble currency codes to proper symbols
// Shipbubble sends "NGN" but we need to display "₦"
func mapCurrencyCode(code string) string {
	currencyMap := map[string]string{
		"NGN": "₦", // Nigerian Naira (Shipbubble's standard response)
		"GHS": "₵", // Ghana Cedi (if ever needed)
		"USD": "$",
		"GBP": "£",
		"EUR": "€",
	}

	symbol, exists := currencyMap[code]
	if !exists || code == "" {
		return "₦" // Default to Naira for Nigerian market
	}

	return symbol
}

func FormatPrice(currency string, amount float64) string {
	symbol := mapCurrencyCode(currency)
	formattedAmount := formatWithCommas(amount)
	return fmt.Sprintf("%s%s", symbol, formattedAmount)
}

func getMockOptions() []GetRatesResponse {
	return []GetRatesResponse{
		{
			DeliveryType:      "Express",
			Description:       "For the quickest delivery possible, choose our express shipping option.",
			DeliveryDaysRange: "Within 24 hours",
			Price:             "₦2500",
			ProviderData: domain.MapArray{{
				"mock":             true,
				"courier_id":       "MOCK_EXPRESS_001",
				"courier_name":     "Mock Express Delivery",
				"service_code":     "MOCK_EXP",
				"rate_card_amount": 2500,
				"request_token":    "mock_request_token_express",
				"insurance": map[string]interface{}{
					"code": "INS001",
					"fee":  100,
				},
				"discount": map[string]interface{}{
					"percentage": 0.0,
					"symbol":     "₦",
					"discounted": 0.0,
				},
			}},
		},
		{
			DeliveryType:      "Fast",
			Description:       "Receive your order faster with our expedited shipping service.",
			DeliveryDaysRange: "2-3 days",
			Price:             "₦1800",
			ProviderData: domain.MapArray{{
				"mock":             true,
				"courier_id":       "MOCK_FAST_002",
				"courier_name":     "Mock Fast Logistics",
				"service_code":     "MOCK_FAST",
				"rate_card_amount": 1800,
				"request_token":    "mock_request_token_fast",
				"insurance": map[string]interface{}{
					"code": "INS002",
					"fee":  75,
				},
				"discount": map[string]interface{}{
					"percentage": 0.0,
					"symbol":     "₦",
					"discounted": 0.0,
				},
			}},
		},
		{
			DeliveryType:      "Standard",
			Description:       "Our most affordable shipping option, perfect for non-urgent orders.",
			DeliveryDaysRange: "4-5 days",
			Price:             "₦1200",
			ProviderData: domain.MapArray{{
				"mock":             true,
				"courier_id":       "MOCK_STANDARD_003",
				"courier_name":     "Mock Standard Shipping",
				"service_code":     "MOCK_STD",
				"rate_card_amount": 1200,
				"request_token":    "mock_request_token_standard",
				"insurance": map[string]interface{}{
					"code": "INS003",
					"fee":  50,
				},
				"discount": map[string]interface{}{
					"percentage": 0.0,
					"symbol":     "₦",
					"discounted": 0.0,
				},
			}},
		},
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

type ShipbubbleAddressInfo struct {
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Address string `json:"address"`
}

type ShipbubbleResponse struct {
	Status  string                 `json:"status"`
	Message string                 `json:"message"`
	Data    ShipbubbleResponseData `json:"data"`
}
type ShipbubbleResponseData struct {
	AddressCode      int     `json:"address_code"`
	Address          string  `json:"address"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	StreetNo         string  `json:"street_no"`
	Street           string  `json:"street"`
	Phone            string  `json:"phone"`
	FormattedAddress string  `json:"formatted_address"`
	Country          string  `json:"country"`
	CountryCode      string  `json:"country_code"`
	City             string  `json:"city"`
	CityCode         string  `json:"city_code"`
	State            string  `json:"state"`
	StateCode        string  `json:"state_code"`
	PostalCode       string  `json:"postal_code"`
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
}

type FetchRatesResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		RequestToken    string    `json:"request_token"`
		Couriers        []Courier `json:"couriers"`
		FastestCourier  Courier   `json:"fastest_courier"`
		CheapestCourier Courier   `json:"cheapest_courier"`
		CheckoutData    struct {
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
			PackageAmount interface{} `json:"package_amount"`
			PackageWeight interface{} `json:"package_weight"`
			PickupTime    string      `json:"pickup_time"`
		} `json:"checkout_data"`
	} `json:"data"`
}

type Courier struct {
	CourierID      interface{} `json:"courier_id"` // Can be string or int
	CourierName    string      `json:"courier_name"`
	CourierImage   string      `json:"courier_image"`
	ServiceCode    string      `json:"service_code"`
	RateCardAmount float64     `json:"rate_card_amount"`
	Insurance      struct {
		Code string `json:"code"`
		Fee  int    `json:"fee"`
	} `json:"insurance"`
	Discount struct {
		Percentage float64 `json:"percentage"`
		Symbol     string  `json:"symbol"`
		Discounted float64 `json:"discounted"`
	} `json:"discount"`
	ServiceType      string      `json:"service_type"` // "pickup" or "dropoff"
	Waybill          bool        `json:"waybill"`
	OnDemand         bool        `json:"on_demand"`         // NEW: Same-day delivery
	IsCODAvailable   bool        `json:"is_cod_available"`  // NEW: Cash on delivery
	CODRemitDays     int         `json:"cod_remit_days"`    // NEW: COD remittance days
	ConnectedAccount bool        `json:"connected_account"` // NEW: Direct account connection
	TrackingLevel    int         `json:"tracking_level"`
	PickupETA        string      `json:"pickup_eta"`
	PickupETATime    string      `json:"pickup_eta_time"`
	DropoffStation   interface{} `json:"dropoff_station"`
	PickupStation    interface{} `json:"pickup_station"`
	DeliveryETA      string      `json:"delivery_eta"`
	DeliveryETATime  string      `json:"delivery_eta_time"`
	Info             []string    `json:"info"`
	Currency         string      `json:"currency"`
	VAT              float64     `json:"vat"`
	Ratings          float64     `json:"ratings"`
	Votes            int         `json:"votes"` // NEW: Number of ratings
	Total            float64     `json:"total"`
	Tracking         struct {    // NEW: Tracking quality indicator
		Bars  int    `json:"bars"`
		Label string `json:"label"`
	} `json:"tracking"`
}

type FetchRatesRequest struct {
	SenderAddressCode    int              `json:"sender_address_code"`
	ReceiverAddressCode  int              `json:"reciever_address_code"` // Intentional typo per Shipbubble API docs
	PickupDate           string           `json:"pickup_date"`
	CategoryID           int              `json:"category_id"`
	PackageItems         []PackageItem    `json:"package_items"`
	ServiceType          string           `json:"service_type,omitempty"` // Optional: filter by pickup/dropoff
	PackageDimension     PackageDimension `json:"package_dimension"`
	DeliveryInstructions string           `json:"delivery_instructions"`
}

type PackageItem struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	UnitWeight  float64     `json:"unit_weight"`
	UnitAmount  interface{} `json:"unit_amount"`
	Quantity    int         `json:"quantity"`
}

type PackageDimension struct {
	Length float64 `json:"length"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}
