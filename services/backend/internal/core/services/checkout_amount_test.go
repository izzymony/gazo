package services

import (
	"strings"
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// The charge amount must be the VALIDATED total, to the kobo.
//
// InitiateCheckout used to do `gross := math.Round(input.Total)`, so a cart
// totalling ₦8,450.50 was charged ₦8,451 — the buyer billed 50 kobo more than
// the total the server had just validated against the product rows, and
// `order.Total` and the charge left disagreeing for every order with a
// non-whole total.
//
// Asserted through ValidateOrder and helper.ToKobo, which is the exact pair the
// charge is built from: ValidateOrder produces `order.Total`, and
// `helper.ToKobo(transaction.Amount)` is what goes on the wire. Standing up the
// whole of InitiateCheckout would need a rewards ledger and a live Paystack
// endpoint to assert a figure these two already determine.
func TestCheckoutChargesTheValidatedTotalToTheKobo(t *testing.T) {
	f := newOrderFixture(t)
	f.setPrice(t, 8450.50)
	option := f.validQuote(t, "0.00")

	order, err := f.svc.ValidateOrder(
		f.order(option.ID, 1, 8450.50, 8450.50), f.userID, false)
	if err != nil {
		t.Fatalf("validate: %v", err)
	}

	// What InitiateCheckout now uses as the gross charge.
	gross := order.Total
	if got := helper.ToKobo(gross); got != 845050 {
		t.Errorf("₦8,450.50 would be charged as %d kobo, want 845050 — the buyer is "+
			"billed %.2f naira, not the total that was validated", got, helper.FromKobo(got))
	}

	// And the rounding that used to happen would have produced a different
	// figure, so this case genuinely reproduces the defect.
	if helper.ToKobo(8451) == 845050 {
		t.Fatal("rounding to whole naira no longer changes this amount, so the test is " +
			"not defending anything")
	}
}

// A cart with kobo on several items, to show the charge tracks the validated
// total rather than a rounded one at any magnitude.
func TestCheckoutChargesKoboOnAMultiItemCart(t *testing.T) {
	f := newOrderFixture(t)
	f.setPrice(t, 8450.50)
	second := f.addProduct(t, "Silk scarf", 2750.25)

	optionA := f.validQuote(t, "1500.75")
	optionB := f.quote(t, "0.00", f.userID, second.ID,
		fixtureStreet, fixtureTown, fixtureState, fixtureCountry, quoteExpiry())

	// 8450.50*2 + 2750.25 = 19651.25, plus 1500.75 shipping = 21152.00
	subTotal := 8450.50*2 + 2750.25
	total := subTotal + 1500.75

	order := requests.Order{
		SubTotal:          subTotal,
		Total:             total,
		ShippingProfileID: f.profile.ID,
		Items: []requests.Item{
			{ProductID: f.product.ID, Price: 8450.50, Quantity: 2, ShippingOptionID: optionA.ID},
			{ProductID: second.ID, Price: 2750.25, Quantity: 1, ShippingOptionID: optionB.ID},
		},
	}
	validated, err := f.svc.ValidateOrder(order, f.userID, false)
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if got := helper.ToKobo(validated.Total); got != 2115200 {
		t.Errorf("charge = %d kobo, want 2115200", got)
	}
}

// Finding 5: the LEGACY /transactions/initiate path. Still the default
// checkout — the web app only calls initiate-checkout when
// NEXT_PUBLIC_ORDER_ON_SUCCESS is set — and it had neither the kobo comparison
// nor the ceiling.
//
// Driven through the real service method, with the order already persisted the
// way the legacy flow leaves it.
func TestLegacyInitiate_ComparesInKoboAndEnforcesTheCeiling(t *testing.T) {
	f := newOrderFixture(t)
	svc := NewTransactionService(f.db)

	// The order's stored total is the ACCUMULATED sum, which is what the legacy
	// flow persists: `Σ(price*qty) + shipping` computed in float64. The client
	// then sends the decimal-nearest double of the same figure. Both are
	// ₦5,750.56, and they are different doubles:
	//
	//	accumulated: 5750.55999999999949068
	//	sent:        5750.56000000000040018
	//
	// Verified to survive the `numeric` round-trip (the column stores
	// 5750.5599999999995 and reads back as the accumulated value), so the float
	// comparison genuinely rejects this and the kobo comparison genuinely
	// accepts it. Operands come from a slice because Go constant-folds a literal
	// float expression at compile time and the divergence disappears.
	amounts := []float64{1500.03, 2, 2750.50, 1}
	accumulated := amounts[0]*amounts[1] + amounts[2]*amounts[3]
	const sent = 5750.56
	if accumulated == sent {
		t.Fatalf("these amounts no longer diverge in float64 (%.17f) — find a new pair "+
			"rather than deleting the test", accumulated)
	}

	order := &domain.Order{
		Invoice: "INV-LEGACY-1", UserID: f.userID,
		SubTotal: accumulated, Total: accumulated,
		ShippingProfileID: f.profile.ID,
	}
	if err := f.db.Create(order).Error; err != nil {
		t.Fatalf("seed order: %v", err)
	}

	t.Run("an amount correct to the kobo is accepted past the comparison", func(t *testing.T) {
		t.Setenv("CHECKOUT_MAX_NGN", "1000000")
		_, err := svc.Initiate(requests.InitiateTransaction{
			Invoice: "INV-LEGACY-1", Amount: sent,
			Email: "buyer@example.com", RedirectURL: "https://cb",
		}, f.userID, false)
		// It gets past validation and fails at Paystack (no network / no key),
		// which is the point: the amount check did not reject it.
		if err != nil && strings.Contains(err.Error(), "invalid amount") {
			t.Errorf("an amount correct to the kobo was rejected as invalid: %v\n"+
				"  stored      %.17f\n  sent        %.17f", err, accumulated, sent)
		}
		if err != nil && strings.Contains(err.Error(), "exceeds the maximum") {
			t.Errorf("an amount under the ceiling was rejected: %v", err)
		}
	})

	t.Run("a genuine mismatch is still rejected", func(t *testing.T) {
		_, err := svc.Initiate(requests.InitiateTransaction{
			Invoice: "INV-LEGACY-1", Amount: sent - 0.01,
			Email: "buyer@example.com", RedirectURL: "https://cb",
		}, f.userID, false)
		if err == nil || !strings.Contains(err.Error(), "invalid amount") {
			t.Errorf("a one-kobo mismatch was not rejected: %v", err)
		}
	})

	t.Run("the ceiling applies at the payment boundary", func(t *testing.T) {
		big := &domain.Order{
			Invoice: "INV-LEGACY-2", UserID: f.userID,
			SubTotal: 2_000_000, Total: 2_000_000,
			ShippingProfileID: f.profile.ID,
		}
		if err := f.db.Create(big).Error; err != nil {
			t.Fatalf("seed order: %v", err)
		}
		t.Setenv("CHECKOUT_MAX_NGN", "1000000")
		_, err := svc.Initiate(requests.InitiateTransaction{
			Invoice: "INV-LEGACY-2", Amount: 2_000_000,
			Email: "buyer@example.com", RedirectURL: "https://cb",
		}, f.userID, false)
		if err == nil || !strings.Contains(err.Error(), "exceeds the maximum") {
			t.Errorf("an order above the ceiling was accepted on the legacy path: %v", err)
		}
	})
}
