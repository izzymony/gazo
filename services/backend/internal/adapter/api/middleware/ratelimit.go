package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// B5: the OTP endpoints (send + verify) were completely unthrottled, so a
// 6-digit code was brute-forceable (~1M guesses => account takeover /
// unauthorized withdrawal). This is a small in-memory fixed-window limiter that
// caps attempts per *identifier* (email / phone / user id) rather than per IP.
//
// Per-identifier keying is deliberate: most of our users are on Nigerian mobile
// carriers behind carrier-grade NAT, so many unrelated users share one public
// IP — IP-keying would throttle real users. Keying on the identifier instead
// caps brute-force against a single account no matter how many IPs an attacker
// rotates through, without punishing bystanders on the same NAT.
//
// It is per-process (not distributed); with a single API instance that is
// enough to make brute-force infeasible. If we scale horizontally this should
// move to a shared store (e.g. Redis) — see B5 follow-up.

type rlWindow struct {
	count int
	reset time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	windows map[string]*rlWindow
	limit   int
	window  time.Duration
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		windows: make(map[string]*rlWindow),
		limit:   limit,
		window:  window,
	}
	go rl.cleanupLoop()
	return rl
}

// cleanupLoop periodically evicts expired windows so the map cannot grow
// without bound. The recover keeps a stray panic from taking down the process.
func (rl *rateLimiter) cleanupLoop() {
	defer func() { _ = recover() }()
	ticker := time.NewTicker(rl.window)
	for range ticker.C {
		now := time.Now()
		rl.mu.Lock()
		for k, w := range rl.windows {
			if now.After(w.reset) {
				delete(rl.windows, k)
			}
		}
		rl.mu.Unlock()
	}
}

// allow records an attempt against key and reports whether it is within the
// limit for the current window.
func (rl *rateLimiter) allow(key string) bool {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()
	w := rl.windows[key]
	if w == nil || now.After(w.reset) {
		rl.windows[key] = &rlWindow{count: 1, reset: now.Add(rl.window)}
		return true
	}
	if w.count >= rl.limit {
		return false
	}
	w.count++
	return true
}

var (
	// otpVerifyLimiter guards OTP verification against brute-force:
	// 10 attempts per identifier per 15 minutes. A legitimate user needs only
	// a handful; 10 leaves room for typos while making 1M guesses hopeless.
	otpVerifyLimiter = newRateLimiter(10, 15*time.Minute)

	// otpSendLimiter guards OTP issuance against SMS-cost abuse / OTP-bombing a
	// victim: 5 sends per identifier per 15 minutes (request + a few resends).
	otpSendLimiter = newRateLimiter(5, 15*time.Minute)
)

// OTPVerifyRateLimit throttles OTP verification per identifier (B5).
func OTPVerifyRateLimit() gin.HandlerFunc { return otpRateLimit(otpVerifyLimiter) }

// OTPSendRateLimit throttles OTP issuance per identifier (B5).
func OTPSendRateLimit() gin.HandlerFunc { return otpRateLimit(otpSendLimiter) }

func otpRateLimit(rl *rateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rl.allow(otpRateKey(c)) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "too many attempts, please wait a few minutes and try again",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}

// otpRateKey derives the throttle key, preferring the target identifier
// (email / phone / authenticated user id) over IP so shared carrier NAT does
// not cause false positives and per-account brute-force is capped across all
// source IPs. IP is only a last resort when no identifier is present.
func otpRateKey(c *gin.Context) string {
	if id := c.Query("identifier"); id != "" {
		return "id:" + strings.ToLower(strings.TrimSpace(id))
	}
	if id := bodyIdentifier(c); id != "" {
		return "id:" + strings.ToLower(strings.TrimSpace(id))
	}
	if uid, ok := c.Get("user_id"); ok {
		if s, ok := uid.(string); ok && s != "" {
			return "uid:" + s
		}
	}
	return "ip:" + c.ClientIP()
}

// bodyIdentifier reads the JSON "identifier" field without consuming the request
// body, restoring it so the downstream handler's ShouldBind still works.
func bodyIdentifier(c *gin.Context) string {
	if c.Request == nil || c.Request.Body == nil {
		return ""
	}
	raw, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return ""
	}
	// Always restore the body, even on a parse miss, so the handler can bind it.
	c.Request.Body = io.NopCloser(bytes.NewBuffer(raw))
	if len(raw) == 0 {
		return ""
	}
	var body struct {
		Identifier string `json:"identifier"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		return ""
	}
	return body.Identifier
}
