package shipping

import (
	"errors"
	"strings"
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

// GetRatesResponse is where the fabricated couriers were introduced, and the
// transport-level test could not see it: FetchShippingRates faithfully returns
// an empty provider response, and the mocks appeared one layer later, during
// mapping.
//
// What the old code did, unconditionally and in every environment: returned two
// invented couriers — "Mock Express Delivery" at ₦2,500 and a "Fast" tier —
// carrying `request_token: "mock_request_token_express"`. On staging or
// production those are shown to a buyer as real choices and charged for. The
// booking then fails at CreateShipment with a token Shipbubble has never seen,
// and by then the buyer has paid.

// isMarkedMock reports whether an option's provider_data carries the mock
// marker. ProviderData is `interface{}`, so this asserts rather than ranges.
func isMarkedMock(t *testing.T, option GetRatesResponse) bool {
	t.Helper()
	entries, ok := option.ProviderData.(domain.MapArray)
	if !ok {
		return false
	}
	for _, entry := range entries {
		if v, ok := entry["mock"]; ok && v == true {
			return true
		}
	}
	return false
}

func emptyRates() *FetchRatesResponse { return &FetchRatesResponse{} }

func ratesWith(couriers ...Courier) *FetchRatesResponse {
	r := &FetchRatesResponse{}
	r.Data.Couriers = couriers
	return r
}

// The finding: zero couriers must NOT become fabricated options outside mock
// mode.
func TestGetRatesResponse_ZeroCouriersDoesNotFabricateOptions(t *testing.T) {
	for _, env := range []string{"staging", "production", "development"} {
		t.Run(env, func(t *testing.T) {
			// Constructed the way the resolved configuration would for a real
			// environment: mock false.
			svc := &ShipbubbleService{apiKey: "sb_sandbox_x", baseURL: "https://api.shipbubble.com/v1", mock: false}

			rates, err := svc.GetRatesResponse(emptyRates(), 12345)
			if err == nil {
				t.Fatalf("zero couriers returned %d option(s) and no error — a delivery "+
					"service that does not exist would be displayed and charged for", len(rates))
			}
			if !errors.Is(err, ErrNoCouriers) {
				t.Errorf("error = %v, want ErrNoCouriers so the caller degrades to "+
					"self-delivery instead of failing hard", err)
			}
			if len(rates) != 0 {
				t.Errorf("got %d options alongside the error", len(rates))
			}
			// The specific fabrication, by name.
			for _, r := range rates {
				if strings.Contains(strings.ToLower(r.DeliveryType), "mock") {
					t.Errorf("fabricated option leaked: %q", r.DeliveryType)
				}
			}
		})
	}
}

// Mock mode keeps its fallback: local development has no real provider to ask
// and no buyer to mislead.
func TestGetRatesResponse_MockModeStillReturnsMockOptions(t *testing.T) {
	svc := &ShipbubbleService{apiKey: "", baseURL: "http://localhost:8088/mock", mock: true}

	rates, err := svc.GetRatesResponse(emptyRates(), 12345)
	if err != nil {
		t.Fatalf("mock mode should still provide options: %v", err)
	}
	if len(rates) == 0 {
		t.Fatal("mock mode returned no options")
	}
	// And they must be recognisable AS mocks, so nobody mistakes one for real.
	marked := false
	for _, r := range rates {
		if isMarkedMock(t, r) {
			marked = true
		}
	}
	if !marked {
		t.Error("mock options do not carry a `mock: true` marker in provider_data")
	}
}

// The mock flag comes from the resolved configuration, so the two cannot
// disagree — this is what makes "mock only when Mock=true" a property of the
// system rather than of one constructor.
func TestNewShipbubbleService_MockFlagTracksResolvedConfig(t *testing.T) {
	cases := []struct {
		name     string
		vars     map[string]string
		wantMock bool
	}{
		{"local with mocks on", map[string]string{
			"APP_ENV": "local", "ENV": "local", "ENABLE_MOCK_SERVICES": "true"}, true},
		{"local with mocks off", map[string]string{
			"APP_ENV": "local", "ENV": "local",
			"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x"}, false},
		{"staging never mocks, even with the flag set", map[string]string{
			"APP_ENV": "staging", "ENV": "staging", "ENABLE_MOCK_SERVICES": "true",
			"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x"}, false},
		{"production never mocks", map[string]string{
			"APP_ENV": "production", "ENV": "production", "ENABLE_MOCK_SERVICES": "true",
			"SHIPBUBBLE_API_KEY_PROD": "sb_prod_x"}, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			cfg, _ := ResolveConfig(env(c.vars))
			if cfg.Mock != c.wantMock {
				t.Errorf("Mock = %v, want %v", cfg.Mock, c.wantMock)
			}

			// Built through the REAL constructor, not a struct literal. A
			// literal here left `mock: cfg.Mock` in NewShipbubbleServiceWithConfig
			// untested — hardcoding it to true was not detected.
			svc := NewShipbubbleServiceWithConfig(cfg)
			rates, err := svc.GetRatesResponse(emptyRates(), 1)
			if c.wantMock {
				if err != nil || len(rates) == 0 {
					t.Errorf("mock config produced no options: rates=%d err=%v", len(rates), err)
				}
				return
			}
			if !errors.Is(err, ErrNoCouriers) {
				t.Errorf("non-mock config did not refuse: rates=%d err=%v", len(rates), err)
			}
		})
	}
}

// Real couriers still map, so the guard above rejects only the empty case.
func TestGetRatesResponse_RealCouriersStillMap(t *testing.T) {
	svc := &ShipbubbleService{baseURL: "https://api.shipbubble.com/v1", mock: false}

	cheap := Courier{CourierName: "GIG", Currency: "NGN", RateCardAmount: 1800, DeliveryETA: "2-3 days"}
	dear := Courier{CourierName: "DHL", Currency: "NGN", RateCardAmount: 5200, DeliveryETA: "1 day"}

	rates, err := svc.GetRatesResponse(ratesWith(dear, cheap), 999)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(rates) != 2 {
		t.Fatalf("got %d options, want 2", len(rates))
	}
	// Cheapest first.
	if rates[0].DeliveryType != "GIG" {
		t.Errorf("first option = %q, want the cheapest (GIG)", rates[0].DeliveryType)
	}
	for _, r := range rates {
		if isMarkedMock(t, r) {
			t.Errorf("a real courier was marked as mock: %q", r.DeliveryType)
		}
	}
}
