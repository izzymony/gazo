//go:build money_safety_repro

package services

import (
	"strings"
	"testing"
)

// These guard two launch-edge defects found in the 2026-08-28 audit pass. Both
// are source-level assertions in the same style as money_safety_repro_test.go —
// the services have no DI seam to fake repositories against yet, so the harness
// asserts on the shape of the code that moves orders and money.

// CancelOrder used to append a "your order has been canceled" activity, emit the
// buyer notification, and then write the item back UNCHANGED — status was never
// set to cancelled. The buyer was told the order was cancelled while it stayed
// live in its previous status.
func TestLaunchEdge_CancelOrderMustActuallySetCancelledStatus(t *testing.T) {
	body := sliceFunc(t, readServiceSource(t, "businessService.go"),
		`func (s *BusinessService) CancelOrder(id, userId string) (*domain.OrderItem, error)`)

	if !strings.Contains(body, "OrderStatusCancelled") {
		t.Fatalf("CancelOrder never sets OrderStatusCancelled; it notifies the buyer of a cancellation that does not happen")
	}

	notifyIdx := strings.Index(body, "buyer.item.cancelled")
	statusIdx := strings.Index(body, "OrderStatusCancelled")
	if notifyIdx >= 0 && statusIdx < 0 {
		t.Fatalf("CancelOrder emits buyer.item.cancelled without ever writing the cancelled status")
	}
}

// The same call also passed the PRE-append `existing` struct to UpdateOrderItem,
// which does `.Select("*").Updates(input)` — writing the stale buyer_activity /
// seller_activity jsonb back over the entries AppendActivity had just persisted.
// The narrow UpdateOrderItemStatus (status + status_updated_at only) is the
// correct write here, and is what admin.go and webhook.go already use.
func TestLaunchEdge_CancelOrderMustNotClobberActivityArrays(t *testing.T) {
	body := sliceFunc(t, readServiceSource(t, "businessService.go"),
		`func (s *BusinessService) CancelOrder(id, userId string) (*domain.OrderItem, error)`)

	if !strings.Contains(body, "AppendActivity") {
		t.Fatalf("CancelOrder no longer appends activities; update this test to match the new flow")
	}

	if strings.Contains(body, "UpdateOrderItem(") && !strings.Contains(body, "UpdateOrderItemStatus(") {
		t.Fatalf("CancelOrder writes the whole item back via UpdateOrderItem after AppendActivity; " +
			"the pre-append snapshot erases the cancellation activities. Use UpdateOrderItemStatus")
	}
}

// Cancelling a delivered item would desync status from money that has already
// moved through clearing into the seller's wallet.
func TestLaunchEdge_CancelOrderMustRejectTerminalStates(t *testing.T) {
	body := sliceFunc(t, readServiceSource(t, "businessService.go"),
		`func (s *BusinessService) CancelOrder(id, userId string) (*domain.OrderItem, error)`)

	if !strings.Contains(body, "OrderStatusDelivered") {
		t.Fatalf("CancelOrder does not reject already-delivered items; cancelling one desyncs status from released funds")
	}
}

// The partner-courier lifecycle is not guest-aware: MarkOrderReady and
// ShipbubbleWebhook both read the non-guest tables only. A guest who picked a
// courier would pay and then strand in orders_in_progress with no way for the
// seller to dispatch. GetShippingOptions must therefore not offer couriers to
// guests. If this gate is ever lifted, the whole lifecycle has to be threaded
// with isGuest first — this test is the tripwire for that.
func TestLaunchEdge_GuestCheckoutMustNotBeOfferedCourierOptions(t *testing.T) {
	body := sliceFunc(t, readServiceSource(t, "shippingService.go"),
		`func (s *ShippingService) GetShippingOptions(request requests.ShippingOptionRequest, userId string, isGuest bool) ([]domain.ShippingOption, error)`)

	guestIdx := strings.Index(body, "if isGuest {")
	if guestIdx < 0 {
		t.Fatalf("GetShippingOptions has no guest gate; guest courier orders strand in orders_in_progress after payment")
	}

	courierIdx := strings.Index(body, "fetchCourierOptions")
	if courierIdx < 0 {
		t.Fatalf("GetShippingOptions no longer fetches courier options; update this test to match the new flow")
	}
	if guestIdx > courierIdx {
		t.Fatalf("GetShippingOptions gates guests AFTER fetching courier options; the gate must short-circuit before couriers are offered")
	}
}

// MarkOrderReady is the reason for the gate above. If someone makes it
// guest-aware, this test should be updated together with the gate — not before.
func TestLaunchEdge_MarkOrderReadyRemainsNonGuestWhileTheCourierGateStands(t *testing.T) {
	body := sliceFunc(t, readServiceSource(t, "businessService.go"),
		`func (s *BusinessService) MarkOrderReady(id, userId string) (*domain.OrderItem, error)`)

	if !strings.Contains(body, "CreateShipment(existing.ID, false)") {
		t.Fatalf("MarkOrderReady's shipment creation changed. If it is now guest-aware, " +
			"the ShipbubbleWebhook and wallet ops must be too — and only then may the " +
			"guest gate in GetShippingOptions be lifted")
	}
}
