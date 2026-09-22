package services

import (
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

// AdminService.RejectWithdrawal held an inline copy of the unguarded
// UnlockBalance — an unconditional subtraction whose RowsAffected was never
// checked. P0 routes it through the repository's guarded release, and this is
// the behavioural cover for that call site: mutation testing showed neutering
// the call still compiled and left every other test green.
//
// Why it matters that this goes negative rather than merely looking odd: the
// withdrawable figure is `available_balance - pending_withdrawals`, so a
// NEGATIVE reservation INFLATES what the seller is allowed to request next.
func TestRejectWithdrawal_ReleasesExactlyOnceAndNeverGoesNegative(t *testing.T) {
	db, _ := openTestDB(t)
	svc := NewAdminService(db)

	const (
		walletID  = "w-reject"
		available = 5000.0
		reserved  = 1000.0
	)
	if err := db.Exec(`INSERT INTO wallets (id, business_id, available_balance, pending_withdrawals)
		VALUES (?, ?, ?, ?)`, walletID, "biz-reject", available, reserved).Error; err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
	if err := db.Exec(`INSERT INTO withdrawal_requests (id, user_id, wallet_id, amount, status)
		VALUES (?, ?, ?, ?, ?)`, "req-1", "seller-1", walletID, reserved,
		string(domain.WithdrawalRequested)).Error; err != nil {
		t.Fatalf("seed request: %v", err)
	}

	pending := func() float64 {
		var v float64
		if err := db.Raw(`SELECT pending_withdrawals FROM wallets WHERE id = ?`, walletID).
			Scan(&v).Error; err != nil {
			t.Fatalf("read reservation: %v", err)
		}
		return v
	}

	// A `requested` payout is rejectable, and the release happens.
	if err := svc.RejectWithdrawal("req-1", "not this time"); err != nil {
		t.Fatalf("rejecting a requested payout failed: %v", err)
	}
	if got := pending(); got != 0 {
		t.Fatalf("pending_withdrawals = %.2f after rejection, want 0", got)
	}

	// The second rejection must be refused — by the status guard first, and by
	// the release guard if that were ever bypassed. Either way the reservation
	// must not move again.
	if err := svc.RejectWithdrawal("req-1", "again"); err == nil {
		t.Error("the same payout was rejected twice")
	}
	if got := pending(); got != 0 {
		t.Errorf("pending_withdrawals = %.2f after a double rejection, want 0 — a negative "+
			"reservation inflates the seller's withdrawable balance", got)
	}
}

// The guard has to hold when the reservation and the request disagree, which is
// the state a partially-applied earlier bug would leave behind. The release
// must fail loudly and take the status change with it, rather than subtract
// past zero and report success.
func TestRejectWithdrawal_RefusesWhenTheReservationIsMissing(t *testing.T) {
	db, _ := openTestDB(t)
	svc := NewAdminService(db)

	if err := db.Exec(`INSERT INTO wallets (id, business_id, available_balance, pending_withdrawals)
		VALUES (?, ?, ?, ?)`, "w-drift", "biz-drift", 5000.0, 0.0).Error; err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
	// A request for 1000 with nothing actually reserved for it.
	if err := db.Exec(`INSERT INTO withdrawal_requests (id, user_id, wallet_id, amount, status)
		VALUES (?, ?, ?, ?, ?)`, "req-drift", "seller-2", "w-drift", 1000.0,
		string(domain.WithdrawalRequested)).Error; err != nil {
		t.Fatalf("seed request: %v", err)
	}

	if err := svc.RejectWithdrawal("req-drift", "reason"); err == nil {
		t.Error("released a reservation that was not there, driving pending_withdrawals to -1000")
	}

	var pendingAfter float64
	db.Raw(`SELECT pending_withdrawals FROM wallets WHERE id = ?`, "w-drift").Scan(&pendingAfter)
	if pendingAfter != 0 {
		t.Errorf("pending_withdrawals = %.2f, want 0 (unchanged)", pendingAfter)
	}

	// The whole decision is one transaction, so the status must be untouched too.
	var status string
	db.Raw(`SELECT status FROM withdrawal_requests WHERE id = ?`, "req-drift").Scan(&status)
	if status != string(domain.WithdrawalRequested) {
		t.Errorf("status = %q, want %q — the request was marked rejected even though its "+
			"funds were never released", status, domain.WithdrawalRequested)
	}
}
