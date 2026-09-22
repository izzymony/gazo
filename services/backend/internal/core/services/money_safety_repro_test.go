//go:build money_safety_repro

package services

import (
	"os"
	"strings"
	"testing"
)

func stripLineComments(src string) string {
	var out strings.Builder
	for _, line := range strings.Split(src, "\n") {
		if idx := strings.Index(line, "//"); idx >= 0 {
			line = line[:idx]
		}
		out.WriteString(line)
		out.WriteByte('\n')
	}
	return out.String()
}

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

	// WithTransaction first: since the persistence-error boundary landed it is
	// the ONLY sanctioned way to open a transaction, and a source guard that
	// knows only the old spellings reports a correct refactor as a money-safety
	// breach. This one did exactly that — it fired on
	// `database.WithTransaction(s.db, "verify", ...)` while the boundary was
	// intact — so the accepted set is kept in step with the rule the
	// transaction guard in internal/database enforces.
	hasTransactionBoundary := strings.Contains(verifyBody, "WithTransaction(") ||
		strings.Contains(verifyBody, ".Transaction(") ||
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

// P3/G7. Money-in must cross the Paystack boundary through helper.ToKobo at
// EVERY point, and the initiate and verify sides must use the same conversion.
//
// This is a source assertion, in the same style as the transaction-boundary
// check above, because the behavioural test cannot reach it. Mutation testing
// showed why: reverting the call site to the old `int32(amount) * 100` leaves
// the whole suite green, since today `gross` is rounded to whole naira
// (transactionService.go) and for whole-naira amounts the two forms agree
// exactly. The forms diverge only for amounts with kobo, or above the int32
// ceiling of ₦21,474,836 — neither of which the current checkout can produce.
//
// So the defect is latent, and it becomes live the moment `gross` stops
// rounding. A behavioural test would have to change that rounding to catch it,
// which is a product change; pinning the conversion is the honest alternative.
//
// The initiate/verify pairing is the part that would actually break a
// payment: if one side sends true kobo and the other expects
// `round(naira) * 100`, a SUCCESSFUL charge fails verification and creates no
// order.
func TestMoneySafety_MoneyInConvertsThroughToKobo(t *testing.T) {
	// Comments stripped: this test bans `int32(math.Round(` , and the code's own
	// note explaining why that form was removed necessarily contains it. A check
	// that reads prose as code fails on its own documentation.
	src := stripLineComments(readServiceSource(t, "transactionService.go"))

	initiateCalls := strings.Count(src, "s.payments.Initiate(")
	if initiateCalls == 0 {
		t.Fatal("no Initiate calls found; update this safety test to match the new payment flow")
	}
	if got := strings.Count(src, "helper.ToKobo("); got < initiateCalls+1 {
		t.Errorf("found %d helper.ToKobo call(s) for %d Initiate call(s) plus the verify "+
			"comparison — at least one money-in conversion is not going through ToKobo, "+
			"so it either truncates kobo or overflows int32 above ₦21,474,836",
			got, initiateCalls)
	}

	// The old forms, explicitly. `* 100` on a naira amount is the shape of the
	// bug in both directions.
	for _, banned := range []string{
		"int32(math.Round(",
		"int32(transaction.Amount)",
		"int(math.Round(transaction.Amount)) * 100",
	} {
		if strings.Contains(src, banned) {
			t.Errorf("transactionService.go still contains %q — money-in must convert with "+
				"helper.ToKobo, which rounds to the kobo and cannot overflow", banned)
		}
	}

	// And the two ends of the same charge must agree, by construction.
	verifyBody := sliceFunc(t, src,
		`func (s *TransactionService) Verify(input requests.VerifyTransaction, isGuest bool) (interface{}, error)`)
	if !strings.Contains(verifyBody, "expectedKobo := helper.ToKobo(transaction.Amount)") {
		t.Error("Verify does not derive the expected amount with helper.ToKobo; if the " +
			"initiate and verify conversions differ, a successful charge fails " +
			"verification and no order is created")
	}
}
