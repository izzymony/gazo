package middleware

import (
	"bytes"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// Constructed directly (not via newRateLimiter) so the tests don't spawn the
// background cleanup goroutine.
func newTestLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{windows: map[string]*rlWindow{}, limit: limit, window: window}
}

func TestRateLimiterCapsAttemptsPerKey(t *testing.T) {
	rl := newTestLimiter(3, time.Minute)
	key := "id:victim@example.com"

	for i := 1; i <= 3; i++ {
		if !rl.allow(key) {
			t.Fatalf("attempt %d should be allowed (limit 3)", i)
		}
	}
	if rl.allow(key) {
		t.Fatal("4th attempt must be blocked — brute-force would otherwise be possible")
	}
}

func TestRateLimiterIsolatesKeys(t *testing.T) {
	// A brute-forcer hammering one identifier must not throttle a different,
	// unrelated user — critical since our users share carrier NAT IPs.
	rl := newTestLimiter(1, time.Minute)
	if !rl.allow("id:attacker-target") {
		t.Fatal("first attempt on target should pass")
	}
	if rl.allow("id:attacker-target") {
		t.Fatal("second attempt on target should be blocked")
	}
	if !rl.allow("id:bystander") {
		t.Fatal("a different identifier must be unaffected")
	}
}

func TestRateLimiterWindowResets(t *testing.T) {
	rl := newTestLimiter(1, time.Minute)
	if !rl.allow("k") {
		t.Fatal("first attempt should pass")
	}
	if rl.allow("k") {
		t.Fatal("second attempt should be blocked within the window")
	}
	// Simulate the window having elapsed.
	rl.windows["k"].reset = time.Now().Add(-time.Second)
	if !rl.allow("k") {
		t.Fatal("attempt after the window resets should pass again")
	}
}

func TestBodyIdentifierRestoresBodyForHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	raw := `{"identifier":"user@example.com","otp":"123456"}`
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("POST", "/validate-code", bytes.NewBufferString(raw))
	c.Request.Header.Set("Content-Type", "application/json")

	if got := bodyIdentifier(c); got != "user@example.com" {
		t.Fatalf("bodyIdentifier = %q, want user@example.com", got)
	}
	// The downstream handler must still be able to read the full body.
	restored, err := c.GetRawData()
	if err != nil {
		t.Fatalf("reading restored body: %v", err)
	}
	if string(restored) != raw {
		t.Fatalf("body not restored: got %q, want %q", string(restored), raw)
	}
}
