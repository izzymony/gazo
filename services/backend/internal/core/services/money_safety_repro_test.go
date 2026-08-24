//go:build money_safety_repro

package services

import (
	"os"
	"strings"
	"testing"
)

func readServiceSource(t *testing.T, filename string) string {
	t.Helper()
	b, err := os.ReadFile(filename)
	if err != nil {
		t.Fatalf("read %s: %v", filename, err)
	}
	return string(b)
}

func sliceBetween(t *testing.T, src, start, end string) string {
	t.Helper()
	startIdx := strings.Index(src, start)
	if startIdx < 0 {
		t.Fatalf("source missing start marker %q", start)
	}
	rest := src[startIdx:]
	endIdx := strings.Index(rest, end)
	if endIdx < 0 {
		t.Fatalf("source missing end marker %q after %q", end, start)
	}
	return rest[:endIdx]
}

func sliceFunc(t *testing.T, src, signature string) string {
	t.Helper()
	startIdx := strings.Index(src, signature)
	if startIdx < 0 {
		t.Fatalf("source missing function %q", signature)
	}
	rest := src[startIdx+len(signature):]
	nextIdx := strings.Index(rest, "\nfunc ")
	if nextIdx < 0 {
		return src[startIdx:]
	}
	return src[startIdx : startIdx+len(signature)+nextIdx]
}

func TestMoneySafety_CourierCompletedWebhookMustClaimDeliveredBeforeMovingFunds(t *testing.T) {
	branch := sliceBetween(t, readServiceSource(t, "webhook.go"), `case "completed":`, `case "cancelled":`)

	if !strings.Contains(branch, "ClaimOrderItemDelivered") {
		t.Fatalf("Shipbubble completed webhook moves funds without ClaimOrderItemDelivered; webhook replay can credit clearing twice")
	}

	claimIdx := strings.Index(branch, "ClaimOrderItemDelivered")
	moveIdx := strings.Index(branch, "MoveToClearingFromOrders")
	if moveIdx < 0 {
		t.Fatalf("Shipbubble completed webhook no longer moves funds; update this safety test to match the new settlement flow")
	}
	if claimIdx > moveIdx {
		t.Fatalf("Shipbubble completed webhook claims delivered after moving funds; claim must happen before settlement")
	}
}

func TestMoneySafety_AdminCompletedMustClaimDeliveredBeforeMovingFunds(t *testing.T) {
	branch := sliceBetween(t, readServiceSource(t, "admin.go"), `case "completed":`, `case "cancelled":`)

	if !strings.Contains(branch, "ClaimOrderItemDelivered") {
		t.Fatalf("admin completed action guards on VendorCredited instead of ClaimOrderItemDelivered; repeated completed actions can credit clearing twice")
	}

	claimIdx := strings.Index(branch, "ClaimOrderItemDelivered")
	moveIdx := strings.Index(branch, "MoveToClearingFromOrders")
	if moveIdx < 0 {
		t.Fatalf("admin completed action no longer moves funds; update this safety test to match the new settlement flow")
	}
	if claimIdx > moveIdx {
		t.Fatalf("admin completed action claims delivered after moving funds; claim must happen before settlement")
	}
}

func TestMoneySafety_PaymentConfirmMustBeAtomicAcrossOrderAndWalletSideEffects(t *testing.T) {
	verifyBody := sliceFunc(t, readServiceSource(t, "transactionService.go"), `func (s *TransactionService) Verify(input requests.VerifyTransaction, isGuest bool) (interface{}, error)`)

	hasTransactionBoundary := strings.Contains(verifyBody, ".Transaction(") ||
		strings.Contains(verifyBody, "Begin()") ||
		strings.Contains(verifyBody, "BeginTx(")
	if !hasTransactionBoundary {
		t.Fatalf("TransactionService.Verify credits wallets, updates item status, and mutates stock without one surrounding DB transaction")
	}
}

func TestMoneySafety_GuestPaymentConfirmMustUpdateGuestOrderItems(t *testing.T) {
	verifyBody := sliceFunc(t, readServiceSource(t, "transactionService.go"), `func (s *TransactionService) Verify(input requests.VerifyTransaction, isGuest bool) (interface{}, error)`)

	if strings.Contains(verifyBody, "UpdateOrderItem(newUpdatedItem.ID, *newUpdatedItem, false)") {
		t.Fatalf("TransactionService.Verify hardcodes isGuest=false when marking paid order items; guest checkout writes the authed table")
	}
	if !strings.Contains(verifyBody, "UpdateOrderItem(newUpdatedItem.ID, *newUpdatedItem, isGuest)") {
		t.Fatalf("TransactionService.Verify must pass isGuest through when updating paid order items")
	}
}
