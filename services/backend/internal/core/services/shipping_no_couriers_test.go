package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/shipping"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"gorm.io/gorm"
)

// End to end through ShippingService.GetShippingOptions, with Shipbubble
// answering "no couriers".
//
// This is the layer the finding is about. Two layers below, FetchShippingRates
// faithfully returned an empty response and GetRatesResponse turned it into two
// invented couriers — "Mock Express Delivery" at ₦2,500, carrying
// `request_token: "mock_request_token_express"`. Outside mock mode those reach
// the buyer as real choices and are charged for, and the booking then fails at
// CreateShipment with a token Shipbubble has never seen. By then the buyer has
// paid.
//
// What must happen instead is the path that already existed for a courier
// outage: the seller's own delivery if they offer one, and an honest "no
// delivery option" if they do not.

type noCourierFixture struct {
	db       *gorm.DB
	svc      *ShippingService
	userID   string
	product  domain.Product
	business domain.Business
	calls    *[]string
}

// newNoCourierFixture seeds the minimum real data the courier path needs, and
// points the client at a stub that validates the address and then returns zero
// couriers.
func newNoCourierFixture(t *testing.T, selfDelivery bool) *noCourierFixture {
	t.Helper()
	db, _ := openTestDB(t)
	if err := db.AutoMigrate(&domain.User{}, &domain.Business{}, &domain.BusinessAddress{},
		&domain.BusinessSetting{}, &domain.Product{}, &domain.Variant{}, &domain.Category{},
		&domain.SubCategory{}, &domain.Collection{}, &domain.ProductRating{}, &domain.Discount{},
		&domain.ExternalCategory{}, &domain.ShippingProfile{}, &domain.ShippingUser{},
		&domain.ShippingOption{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	var calls []string
	stub := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		switch r.URL.Path {
		case "/shipping/address/validate":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status": "success", "message": "ok",
				"data": map[string]any{"address_code": 555111},
			})
		case "/shipping/fetch_rates":
			// A legitimate no-coverage answer. Shipbubble's message on these
			// echoes the submitted address back, which is why none of it is kept.
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "success",
				"message": "no couriers available for 12 Awolowo Road, Ikoyi, Lagos",
				"data":    map[string]any{"couriers": []any{}},
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	t.Cleanup(stub.Close)

	user := &domain.User{Email: "buyer@example.com", UserName: "nc-buyer", Phone: "+2348000000101",
		Firstname: "Ada", Lastname: "Obi"}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	area := "Lagos"
	business := &domain.Business{Name: "Luma Carry", Email: "shop@example.com", Phone: "+2348000000102"}
	if err := db.Create(business).Error; err != nil {
		t.Fatalf("seed business: %v", err)
	}
	if err := db.Create(&domain.BusinessAddress{BusinessID: business.ID, Country: "Nigeria",
		Area: &area, AddressLine: "4 Bank Road", ShipbubbleAddressCode: 999888}).Error; err != nil {
		t.Fatalf("seed business address: %v", err)
	}

	// Self delivery on or off is the whole variable: with it, the seller has an
	// option to fall back to; without it, the buyer must be told there is none.
	zones := domain.SelfZones{}
	if selfDelivery {
		zones.Local = domain.ZoneRate{Enabled: true, Rate: 1500, Eta: "1-2 days"}
	}
	if err := db.Create(&domain.BusinessSetting{BusinessID: business.ID,
		PartnerEnabled: true, SelfZones: zones}).Error; err != nil {
		t.Fatalf("seed business setting: %v", err)
	}

	if err := db.Create(&domain.ExternalCategory{Name: "Bags", Provider: "shipbubble",
		ProviderId: "77"}).Error; err != nil {
		t.Fatalf("seed external category: %v", err)
	}
	var extCat domain.ExternalCategory
	if err := db.First(&extCat).Error; err != nil {
		t.Fatalf("read external category: %v", err)
	}

	stock := 10
	product := &domain.Product{Title: "Leather tote", Price: 8450.50, Stock: &stock,
		Status: string(helper.ProductStatusActive), BusinessID: business.ID,
		ExternalCategoryId: extCat.ID, Weight: 2}
	if err := db.Create(product).Error; err != nil {
		t.Fatalf("seed product: %v", err)
	}

	svc := NewShippingService(db)
	// Stated explicitly rather than assembled from environment variables: the
	// property under test is "Mock=false means no fabricated options", and
	// reaching it through env plumbing would test the plumbing.
	svc.shipbubbleService = shipping.NewShipbubbleServiceWithConfig(shipping.Config{
		BaseURL: stub.URL, APIKey: "sb_sandbox_test", Mock: false,
	})

	return &noCourierFixture{db: db, svc: svc, userID: user.ID,
		product: *product, business: *business, calls: &calls}
}

func (f *noCourierFixture) request() requests.ShippingOptionRequest {
	return requests.ShippingOptionRequest{
		ProductId: f.product.ID, Quantity: 1,
		Street: "12 Awolowo Road", Town: "Ikoyi", State: "Lagos", Country: "Nigeria",
	}
}

// persistedOptions reads what actually reached the table, which is what a buyer
// would be shown and charged for.
func (f *noCourierFixture) persistedOptions(t *testing.T) []domain.ShippingOption {
	t.Helper()
	var options []domain.ShippingOption
	if err := f.db.Find(&options).Error; err != nil {
		t.Fatalf("read shipping options: %v", err)
	}
	return options
}

func assertNoFabricatedCourier(t *testing.T, options []domain.ShippingOption) {
	t.Helper()
	for _, o := range options {
		lower := strings.ToLower(o.DeliveryType + " " + o.Description + " " + o.Provider)
		for _, marker := range []string{"mock", "express delivery"} {
			if strings.Contains(lower, marker) {
				t.Errorf("a fabricated courier was persisted: delivery_type=%q provider=%q",
					o.DeliveryType, o.Provider)
			}
		}
		for _, entry := range o.ProviderData {
			if v, ok := entry["mock"]; ok && v == true {
				t.Errorf("a persisted option is marked mock: %q", o.DeliveryType)
			}
			if tok, ok := entry["request_token"].(string); ok && strings.HasPrefix(tok, "mock_") {
				t.Errorf("a persisted option carries a fabricated request token: %q", tok)
			}
		}
	}
}

// Zero couriers, seller DOES offer their own delivery: the buyer is offered
// exactly that, and nothing invented.
func TestGetShippingOptions_ZeroCouriersFallsBackToSellerDelivery(t *testing.T) {
	f := newNoCourierFixture(t, true)

	options, err := f.svc.GetShippingOptions(f.request(), f.userID, false)
	if err != nil {
		t.Fatalf("expected the seller's own delivery, got an error: %v", err)
	}
	if len(options) != 1 {
		t.Fatalf("got %d options, want exactly 1 (the seller's own delivery)", len(options))
	}
	if options[0].Provider != "self" {
		t.Errorf("provider = %q, want %q", options[0].Provider, "self")
	}
	if !strings.Contains(options[0].DeliveryType, "Luma Carry") {
		t.Errorf("delivery_type = %q, want the seller's own delivery", options[0].DeliveryType)
	}
	assertNoFabricatedCourier(t, options)
	assertNoFabricatedCourier(t, f.persistedOptions(t))

	// The provider really was asked — otherwise this passes without exercising
	// the zero-courier path at all.
	if len(*f.calls) < 2 {
		t.Errorf("stub was called %v, expected address validation AND a rate fetch", *f.calls)
	}
}

// Zero couriers, seller offers NO delivery of their own: the buyer is told so.
// The old behaviour offered two couriers that do not exist.
func TestGetShippingOptions_ZeroCouriersAndNoSelfDeliveryIsRefused(t *testing.T) {
	f := newNoCourierFixture(t, false)

	options, err := f.svc.GetShippingOptions(f.request(), f.userID, false)
	if err == nil {
		t.Fatalf("got %d option(s) and no error — with no courier and no seller "+
			"delivery there is nothing to offer", len(options))
	}
	if !strings.Contains(err.Error(), "no delivery option") {
		t.Errorf("error = %q, want it to say there is no delivery option", err)
	}
	if len(options) != 0 {
		t.Errorf("got %d options alongside the error", len(options))
	}

	// And nothing was written. A fabricated option persisted here would be
	// selectable at checkout even though the request errored.
	persisted := f.persistedOptions(t)
	assertNoFabricatedCourier(t, persisted)
	if len(persisted) != 0 {
		t.Errorf("persisted %d option(s) for a request that had none to offer", len(persisted))
	}
}

// The provider's no-coverage message echoes the submitted address. It must not
// reach the error a caller logs.
func TestGetShippingOptions_ZeroCourierErrorCarriesNoAddress(t *testing.T) {
	f := newNoCourierFixture(t, false)

	_, err := f.svc.GetShippingOptions(f.request(), f.userID, false)
	if err == nil {
		t.Fatal("expected an error")
	}
	for _, leak := range []string{"Awolowo", "Ikoyi", "12 Awolowo Road"} {
		if strings.Contains(err.Error(), leak) {
			t.Errorf("the returned error leaks %q: %q", leak, err)
		}
	}
}
