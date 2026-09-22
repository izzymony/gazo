package controller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// The admin UI branches on this response, so the contract is worth pinning at
// the HTTP layer rather than at the service boundary.
//
// A disabled payout system is not a bad request. It means the platform cannot
// pay right now and NOTHING happened to the withdrawal — the admin should come
// back later, not go and look at the seller's bank details. Returning 400 here
// would put a permanent-looking failure in front of a temporary one.
func TestApproveWithdrawal_PayoutsDisabledReturns503(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("PAYOUTS_LIVE", "")

	router := gin.New()
	router.PATCH("/approve/:id", newTestAdminController(t).ApproveWithdrawal)

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodPatch, "/approve/any-id", nil))

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503 (body: %s)", rec.Code, rec.Body.String())
	}

	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not JSON: %v", err)
	}
	if body["reason"] != "payouts_disabled" {
		t.Errorf(`reason = %v, want "payouts_disabled" — the admin client branches on it`, body["reason"])
	}
	if msg, _ := body["error"].(string); msg == "" {
		t.Error("no explanation for the admin; the client shows this text")
	}
}

// And the gate discriminates: with payouts ON, an ordinary bad request is still
// a 400. A handler that answered 503 for everything would be useless.
func TestApproveWithdrawal_OtherFailuresAreStill400(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("PAYOUTS_LIVE", "true")

	router := gin.New()
	router.PATCH("/approve/:id", newTestAdminController(t).ApproveWithdrawal)

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodPatch, "/approve/does-not-exist", nil))

	if rec.Code == http.StatusServiceUnavailable {
		t.Fatalf("a missing withdrawal was reported as 503; only a disabled payout " +
			"system may claim the platform cannot pay")
	}
	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400 (body: %s)", rec.Code, rec.Body.String())
	}
}

// The disabled check runs before anything touches the database, which is why
// this needs no schema: that ordering is the guarantee that a refused approval
// cannot have changed a withdrawal on its way out.
func newTestAdminController(t *testing.T) *AdminController {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:payout_gate_"+t.Name()+"?mode=memory&cache=shared"),
		&gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if sqlDB, err := db.DB(); err == nil {
		t.Cleanup(func() { _ = sqlDB.Close() })
	}
	return NewAdminController(db)
}
