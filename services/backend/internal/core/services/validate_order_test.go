package services

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"gorm.io/gorm"
)

// P3 at the checkout boundary: the money comparison, the ceiling, the shipping
// quote binding and the address ownership check — through the real
// ValidateOrder rather than a copy of its predicates, because the predicates
// being right is worthless if the call site does not reach them.

type orderFixture struct {
	db      *gorm.DB
	svc     *OrderService
	userID  string
	product domain.Product
	profile domain.ShippingProfile
}

const (
	fixtureStreet  = "12 Awolowo Road"
	fixtureTown    = "Ikoyi"
	fixtureState   = "Lagos"
	fixtureCountry = "Nigeria"
)

func newOrderFixture(t *testing.T) *orderFixture {
	t.Helper()
	db, _ := openTestDB(t)
	// ShippingUser is here because FindShippingProfile does
	// `Preload(clause.Associations)`: without the table the lookup errors, and
	// ValidateOrder reports that as a generic "something went wrong" — which is
	// how a fixture gap masquerades as the validation under test working.
	// The association tables are here because the repositories this path uses
	// preload them — ProductRepository.Find preloads six, and
	// FindShippingProfile does `Preload(clause.Associations)`. Without the
	// tables those lookups error, and ValidateOrder reports the failure as a
	// generic "error fetching product" / "something went wrong" — which is how a
	// fixture gap masquerades as the validation under test working.
	if err := db.AutoMigrate(&domain.User{}, &domain.Business{}, &domain.Product{},
		&domain.Variant{}, &domain.Category{}, &domain.SubCategory{},
		&domain.Collection{}, &domain.ProductRating{}, &domain.Discount{},
		&domain.ShippingProfile{}, &domain.ShippingUser{}, &domain.ShippingOption{},
		&domain.Order{}, &domain.OrderItem{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	// `users.user_name` is UNIQUE, so every seeded user needs a distinct one or
	// the second insert collides on the empty string.
	user := &domain.User{Email: "buyer@example.com", UserName: "buyer", Phone: "+2348000000001"}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}
	stock := 200
	product := &domain.Product{
		Title: "Leather tote", Price: 8450.50, Stock: &stock,
		Status: string(helper.ProductStatusActive), BusinessID: "biz-1",
	}
	if err := db.Create(product).Error; err != nil {
		t.Fatalf("seed product: %v", err)
	}
	profile := &domain.ShippingProfile{
		UserID: user.ID, Street: fixtureStreet, Town: fixtureTown,
		State: fixtureState, Country: fixtureCountry,
	}
	if err := db.Create(profile).Error; err != nil {
		t.Fatalf("seed profile: %v", err)
	}

	return &orderFixture{db: db, svc: NewOrderService(db), userID: user.ID,
		product: *product, profile: *profile}
}

// setPrice re-prices the fixture product, for the cases that need specific
// amounts to reproduce a floating-point divergence.
func (f *orderFixture) setPrice(t *testing.T, price float64) {
	t.Helper()
	if err := f.db.Model(&domain.Product{}).Where("id = ?", f.product.ID).
		Update("price", price).Error; err != nil {
		t.Fatalf("re-price product: %v", err)
	}
	f.product.Price = price
}

// addProduct seeds a second sellable product, for the multi-item cart that is
// the only way to exercise the SUB-TOTAL comparison: with one item the
// sub-total the client sends is the same expression the server computes, so the
// two are bit-identical and a float comparison passes. Error only accumulates
// across items.
func (f *orderFixture) addProduct(t *testing.T, title string, price float64) domain.Product {
	t.Helper()
	stock := 200
	product := &domain.Product{
		Title: title, Price: price, Stock: &stock,
		Status: string(helper.ProductStatusActive), BusinessID: "biz-1",
	}
	if err := f.db.Create(product).Error; err != nil {
		t.Fatalf("seed product %s: %v", title, err)
	}
	return *product
}

// quote persists a shipping option bound to whatever is passed, so a test can
// bind one deliberately wrongly.
func (f *orderFixture) quote(t *testing.T, price string, userID, productID string,
	street, town, state, country string, expires time.Time) domain.ShippingOption {
	t.Helper()
	option := &domain.ShippingOption{
		Provider: "self", DeliveryType: "standard", Price: price,
		UserID: userID, ProductID: productID,
		AddressFingerprint: domain.QuoteFingerprint(street, town, state, country),
		ExpiresAt:          &expires,
	}
	if err := f.db.Create(option).Error; err != nil {
		t.Fatalf("seed shipping option: %v", err)
	}
	return *option
}

// quoteExpiry is the expiry a freshly-issued quote has.
func quoteExpiry() time.Time { return time.Now().Add(time.Hour) }

// validQuote is the quote a real checkout would have.
func (f *orderFixture) validQuote(t *testing.T, price string) domain.ShippingOption {
	t.Helper()
	return f.quote(t, price, f.userID, f.product.ID,
		fixtureStreet, fixtureTown, fixtureState, fixtureCountry, time.Now().Add(time.Hour))
}

func (f *orderFixture) order(optionID string, quantity int, subTotal, total float64) requests.Order {
	return requests.Order{
		SubTotal:          subTotal,
		Total:             total,
		ShippingProfileID: f.profile.ID,
		Items: []requests.Item{{
			ProductID: f.product.ID, Price: f.product.Price,
			Quantity: quantity, ShippingOptionID: optionID,
		}},
	}
}

// G13. The totals used to be compared with `!=` on float64, over columns
// declared `decimal` with no enforced scale. A cart whose arithmetic is exact
// to the kobo was rejected, because the sum the server ACCUMULATES
// (`price*qty + shipping`) and the double nearest the true decimal total —
// which is what the client sends as `total` — differ by one ULP.
//
// The amounts are not arbitrary. ₦1,500.03 x 2 + ₦1,500.00 shipping was found
// by searching realistic Nigerian retail prices for a triple that ACTUALLY
// diverges in float64:
//
//	accumulated: 4500.05999999999949068
//	sent:        4500.06000000000040018
//
// Both are ₦4,500.06. My first attempt at this test used ₦8,450.50 x 2 + ₦0.30
// and silently SKIPPED, because at that magnitude the two happen to land on the
// same double — a test that proves nothing while looking like it covers the
// defect.
func TestValidateOrder_ComparesTotalsInKoboNotFloats(t *testing.T) {
	f := newOrderFixture(t)
	f.setPrice(t, 1500.03)
	option := f.validQuote(t, "1500.00")

	// The operands come from a SLICE, not from literals. Go evaluates
	// `1500.03*2 + 1500.00` as an untyped constant expression at COMPILE time
	// with arbitrary precision, yielding exactly 4500.06 — so a version of this
	// written with literals reports "these amounts no longer diverge" and
	// skips. The server multiplies a float64 read from the database, at runtime,
	// which is what actually diverges. This is the same constant-folding trap
	// that helper/money_test.go documents; it has now caught me twice.
	runtime := []float64{1500.03, 2, 1500.00}
	itemTotal := runtime[0] * runtime[1]
	accumulated := itemTotal + runtime[2]
	// What the client sends: the double nearest ₦4,500.06.
	sent := 4500.06

	if accumulated == sent {
		t.Fatalf("these amounts no longer diverge in float64 (%.17f), so this test is "+
			"not defending anything — find a new triple rather than deleting it", accumulated)
	}

	order, err := f.svc.ValidateOrder(f.order(option.ID, 2, itemTotal, sent), f.userID, false)
	if err != nil {
		t.Fatalf("a cart correct to the kobo was refused: %v\n"+
			"  accumulated %.17f\n  sent        %.17f", err, accumulated, sent)
	}
	if order == nil {
		t.Fatal("no order returned")
	}
}

// The SUB-TOTAL comparison, which needs two items to reach.
//
// Found by mutation testing: reverting the sub-total check to a float `!=`
// left the single-item test green, because with one item the client's
// sub_total and the server's `price*qty` are the same expression and therefore
// the same bits. Error only accumulates when there is something to accumulate
// across.
//
// ₦1,500.03 x2 + ₦2,750.50 x1 — both ₦5,750.56, and:
//
//	accumulated: 5750.55999999999949068
//	sent:        5750.56000000000040018
func TestValidateOrder_ComparesSubTotalInKobo(t *testing.T) {
	f := newOrderFixture(t)
	f.setPrice(t, 1500.03)
	second := f.addProduct(t, "Silk scarf", 2750.50)

	// Runtime values, not literals: Go constant-folds a literal expression at
	// compile time with arbitrary precision and the divergence disappears.
	amounts := []float64{1500.03, 2, 2750.50, 1}
	accumulated := amounts[0]*amounts[1] + amounts[2]*amounts[3]
	sent := 5750.56

	if accumulated == sent {
		t.Fatalf("these amounts no longer diverge in float64 (%.17f) — find a new pair "+
			"rather than deleting the test", accumulated)
	}

	optionA := f.validQuote(t, "0.00")
	optionB := f.quote(t, "0.00", f.userID, second.ID,
		fixtureStreet, fixtureTown, fixtureState, fixtureCountry, time.Now().Add(time.Hour))

	order := requests.Order{
		SubTotal:          sent,
		Total:             sent,
		ShippingProfileID: f.profile.ID,
		Items: []requests.Item{
			{ProductID: f.product.ID, Price: 1500.03, Quantity: 2, ShippingOptionID: optionA.ID},
			{ProductID: second.ID, Price: 2750.50, Quantity: 1, ShippingOptionID: optionB.ID},
		},
	}
	if _, err := f.svc.ValidateOrder(order, f.userID, false); err != nil {
		t.Fatalf("a two-item cart correct to the kobo was refused: %v\n"+
			"  accumulated %.17f\n  sent        %.17f", err, accumulated, sent)
	}
}

// The comparison keeps its strictness: a genuine mismatch of one kobo is still
// refused. Without this the "fix" could have been to stop comparing.
func TestValidateOrder_StillRefusesARealMismatch(t *testing.T) {
	f := newOrderFixture(t)
	option := f.validQuote(t, "0.00")
	subTotal := 8450.50

	for _, c := range []struct {
		name     string
		subTotal float64
		total    float64
		want     string
	}{
		{"sub-total one kobo low", subTotal - 0.01, subTotal - 0.01, "sub total"},
		{"sub-total one kobo high", subTotal + 0.01, subTotal + 0.01, "sub total"},
		{"total one kobo low", subTotal, subTotal - 0.01, "total price"},
		{"total understated by a lot", subTotal, 1, "total price"},
	} {
		t.Run(c.name, func(t *testing.T) {
			_, err := f.svc.ValidateOrder(f.order(option.ID, 1, c.subTotal, c.total), f.userID, false)
			if err == nil {
				t.Fatalf("accepted sub_total=%.2f total=%.2f", c.subTotal, c.total)
			}
			if !strings.Contains(err.Error(), c.want) {
				t.Errorf("error %q does not mention %q", err, c.want)
			}
		})
	}
}

// G7's product ceiling, enforced server-side.
func TestValidateOrder_EnforcesTheCheckoutCeiling(t *testing.T) {
	f := newOrderFixture(t)
	option := f.validQuote(t, "0.00")

	// 8450.50 x 100 = 845,050 — under the ₦1,000,000 launch default.
	t.Setenv("CHECKOUT_MAX_NGN", "1000000")
	subTotal := f.product.Price * 100
	if _, err := f.svc.ValidateOrder(f.order(option.ID, 100, subTotal, subTotal), f.userID, false); err != nil {
		t.Fatalf("an order under the ceiling was refused: %v", err)
	}

	// Now lower the ceiling below it. Same order, must be refused.
	t.Setenv("CHECKOUT_MAX_NGN", "100000")
	_, err := f.svc.ValidateOrder(f.order(option.ID, 100, subTotal, subTotal), f.userID, false)
	if err == nil {
		t.Fatal("an order above the ceiling was accepted")
	}
	if !strings.Contains(err.Error(), "exceeds the maximum") {
		t.Errorf("error %q does not explain the ceiling", err)
	}
}

// G12. Four ways a quote can be the wrong quote, each refused through the real
// checkout path.
func TestValidateOrder_RefusesAQuoteRaisedForSomethingElse(t *testing.T) {
	f := newOrderFixture(t)
	hour := time.Now().Add(time.Hour)

	otherStock := 10
	otherProduct := &domain.Product{
		Title: "Silk scarf", Price: 4000, Stock: &otherStock,
		Status: string(helper.ProductStatusActive), BusinessID: "biz-1",
	}
	if err := f.db.Create(otherProduct).Error; err != nil {
		t.Fatalf("seed second product: %v", err)
	}

	cases := []struct {
		name  string
		quote domain.ShippingOption
		want  string
	}{
		{
			name: "raised by another buyer",
			quote: f.quote(t, "0.00", "someone-else", f.product.ID,
				fixtureStreet, fixtureTown, fixtureState, fixtureCountry, hour),
			want: "different account",
		},
		{
			name: "raised for another product",
			quote: f.quote(t, "0.00", f.userID, otherProduct.ID,
				fixtureStreet, fixtureTown, fixtureState, fixtureCountry, hour),
			want: "different product",
		},
		{
			name: "raised for another address",
			quote: f.quote(t, "0.00", f.userID, f.product.ID,
				"4 Bank Road", "Sokoto", "Sokoto", fixtureCountry, hour),
			want: "different address",
		},
		{
			name: "expired",
			quote: f.quote(t, "0.00", f.userID, f.product.ID,
				fixtureStreet, fixtureTown, fixtureState, fixtureCountry,
				time.Now().Add(-time.Minute)),
			want: "expired",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := f.svc.ValidateOrder(
				f.order(c.quote.ID, 1, f.product.Price, f.product.Price), f.userID, false)
			if err == nil {
				t.Fatalf("checkout accepted a quote %s", c.name)
			}
			if !strings.Contains(err.Error(), c.want) {
				t.Errorf("error %q does not mention %q", err, c.want)
			}
		})
	}
}

// A quote written before the binding existed has zero values and is refused,
// rather than being waved through by a legacy exemption.
func TestValidateOrder_RefusesAnUnboundLegacyQuote(t *testing.T) {
	f := newOrderFixture(t)
	legacy := &domain.ShippingOption{Provider: "self", Price: "0.00"}
	if err := f.db.Create(legacy).Error; err != nil {
		t.Fatalf("seed legacy option: %v", err)
	}

	_, err := f.svc.ValidateOrder(
		f.order(legacy.ID, 1, f.product.Price, f.product.Price), f.userID, false)
	if err == nil {
		t.Fatal("an unbound legacy quote was accepted")
	}
	if !strings.Contains(err.Error(), "predates quote binding") {
		t.Errorf("error %q does not explain that the quote must be reselected", err)
	}
}

// G29. ValidateOrder never looked at shipping_profile_id: `helper.Copy` carried
// it into the order and nothing checked it existed or belonged to the buyer.
func TestValidateOrder_RequiresTheBuyersOwnAddress(t *testing.T) {
	f := newOrderFixture(t)
	option := f.validQuote(t, "0.00")

	// `phone` is UNIQUE too, so it needs its own value as well as a user_name.
	stranger := &domain.User{Email: "stranger@example.com", UserName: "stranger", Phone: "+2348000000002"}
	if err := f.db.Create(stranger).Error; err != nil {
		t.Fatalf("seed stranger: %v", err)
	}
	strangersProfile := &domain.ShippingProfile{
		UserID: stranger.ID, Street: fixtureStreet, Town: fixtureTown,
		State: fixtureState, Country: fixtureCountry,
	}
	if err := f.db.Create(strangersProfile).Error; err != nil {
		t.Fatalf("seed stranger's profile: %v", err)
	}

	order := f.order(option.ID, 1, f.product.Price, f.product.Price)
	order.ShippingProfileID = strangersProfile.ID
	if _, err := f.svc.ValidateOrder(order, f.userID, false); err == nil {
		t.Error("checkout accepted another user's delivery address")
	}

	order.ShippingProfileID = "does-not-exist"
	if _, err := f.svc.ValidateOrder(order, f.userID, false); err == nil {
		t.Error("checkout accepted a delivery address that does not exist")
	}

	order.ShippingProfileID = ""
	if _, err := f.svc.ValidateOrder(order, f.userID, false); err == nil {
		t.Error("checkout accepted an empty delivery address")
	}
}

// The happy path, so every refusal above is a refusal of something specific
// rather than of everything.
func TestValidateOrder_AcceptsAWellFormedOrder(t *testing.T) {
	f := newOrderFixture(t)
	option := f.validQuote(t, "1500.00")

	subTotal := f.product.Price * 3
	total := subTotal + 1500

	order, err := f.svc.ValidateOrder(f.order(option.ID, 3, subTotal, total), f.userID, false)
	if err != nil {
		t.Fatalf("a well-formed order was refused: %v", err)
	}
	if len(order.Items) != 1 {
		t.Fatalf("got %d items, want 1", len(order.Items))
	}
	if order.Items[0].BusinessID != f.product.BusinessID {
		t.Errorf("business_id = %q, want %q", order.Items[0].BusinessID, f.product.BusinessID)
	}
	if fmt.Sprintf("%.2f", order.Total) != fmt.Sprintf("%.2f", total) {
		t.Errorf("total = %.2f, want %.2f", order.Total, total)
	}
}
