package controller

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// The Shipbubble webhook must FAIL CLOSED on a bad configuration.
//
// It used to log the configuration errors and carry on as long as some key was
// present. That is the dangerous half of a check: a misconfigured environment
// is precisely the case where the key on hand may be the WRONG key — the
// sandbox secret verifying production events, or a live secret reached from
// staging — and a signature computed with the wrong secret does not fail
// safely, it fails confusingly. Worse, in the one configuration that matters
// here (staging holding a production key) the signature would VERIFY, because
// the key is real; it is simply the wrong environment's.
//
// The controller's service is never reached in any of these cases: the config
// gate returns before it, which is what lets these run with no database.

func signBody(secret string, body []byte) string {
	hasher := hmac.New(sha512.New, []byte(secret))
	hasher.Write(body)
	return hex.EncodeToString(hasher.Sum(nil))
}

func postWebhook(t *testing.T, signature string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	req := httptest.NewRequest(http.MethodPost, "/webhook/shipbubble", bytes.NewReader(body))
	if signature != "" {
		req.Header.Set("x-ship-signature", signature)
	}
	c.Request = req

	(&WebhookController{}).ShipbubbleWebhook(c)
	return rec
}

// The core assertion the finding asks for: under an invalid configuration, a
// CORRECTLY signed request is still refused.
func TestShipbubbleWebhook_RejectsEvenAValidSignatureWhenMisconfigured(t *testing.T) {
	body := []byte(`{"data":{"order_id":"SB-1","status":"completed"}}`)

	cases := []struct {
		name string
		vars map[string]string
		// key is the secret the request is signed with — deliberately the one
		// the service would have used, so the signature is genuinely valid.
		key string
	}{
		{
			name: "base URL points at the dashboard host",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test",
				"SHIPBUBBLE_API_URL":         "https://app.shipbubble.com/api/v1"},
			key: "sb_sandbox_test",
		},
		{
			name: "staging holds a production key — the signature would verify",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_prod_live",
				"SHIPBUBBLE_API_URL":         "https://api.shipbubble.com/v1"},
			key: "sb_prod_live",
		},
		{
			name: "production holds a sandbox key",
			vars: map[string]string{"APP_ENV": "production", "ENV": "production",
				"SHIPBUBBLE_API_KEY_PROD": "sb_sandbox_test",
				"SHIPBUBBLE_API_URL":      "https://api.shipbubble.com/v1"},
			key: "sb_sandbox_test",
		},
		{
			name: "base URL is not https",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test",
				"SHIPBUBBLE_API_URL":         "http://api.shipbubble.com/v1"},
			key: "sb_sandbox_test",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			for k, v := range c.vars {
				t.Setenv(k, v)
			}
			// Signed with the exact key the handler would resolve, so nothing
			// but the configuration gate can be what rejects this.
			rec := postWebhook(t, signBody(c.key, body), body)

			if rec.Code != http.StatusInternalServerError {
				t.Errorf("status = %d, want 500 — a correctly signed event was accepted "+
					"under an invalid configuration", rec.Code)
			}
			if rec.Code == http.StatusOK {
				t.Error("the webhook was PROCESSED while misconfigured")
			}
		})
	}
}

// A warning must not fail the webhook closed. An unused staging key in
// production is dead configuration, not a reason to reject live events —
// which is the same distinction the boot gate now makes.
func TestShipbubbleWebhook_AWarningDoesNotRejectTheRequest(t *testing.T) {
	body := []byte(`{"data":{"order_id":"SB-2","status":"completed"}}`)
	t.Setenv("APP_ENV", "production")
	t.Setenv("ENV", "production")
	t.Setenv("SHIPBUBBLE_API_KEY_PROD", "sb_prod_live")
	t.Setenv("SHIPBUBBLE_API_KEY_STAGING", "sb_sandbox_unused") // the warning
	t.Setenv("SHIPBUBBLE_API_URL", "https://api.shipbubble.com/v1")

	// A WRONG signature, so the request stops at the HMAC comparison rather
	// than reaching the service. Reaching that comparison at all is the proof
	// that the configuration gate let it through.
	rec := postWebhook(t, signBody("not-the-key", body), body)

	if rec.Code == http.StatusInternalServerError {
		t.Error("status = 500 — a mere warning rejected the request as a misconfiguration")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401 (reached the signature check)", rec.Code)
	}
}

// With a sound configuration the gate is transparent: a wrong signature is
// refused as a signature failure, not as a configuration failure.
func TestShipbubbleWebhook_SoundConfigReachesTheSignatureCheck(t *testing.T) {
	body := []byte(`{"data":{"order_id":"SB-3","status":"completed"}}`)
	t.Setenv("APP_ENV", "staging")
	t.Setenv("ENV", "staging")
	t.Setenv("SHIPBUBBLE_API_KEY_STAGING", "sb_sandbox_test")
	t.Setenv("SHIPBUBBLE_API_URL", "https://api.shipbubble.com/v1")

	rec := postWebhook(t, signBody("wrong-secret", body), body)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}

// A missing key is still a 500, and still before any processing.
func TestShipbubbleWebhook_MissingKeyIsRefused(t *testing.T) {
	body := []byte(`{"data":{"order_id":"SB-4"}}`)
	t.Setenv("APP_ENV", "staging")
	t.Setenv("ENV", "staging")
	t.Setenv("SHIPBUBBLE_API_KEY_STAGING", "")
	t.Setenv("SHIPBUBBLE_API_URL", "https://api.shipbubble.com/v1")

	rec := postWebhook(t, signBody("anything", body), body)
	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
}

// The signature header is still required, checked before anything else.
func TestShipbubbleWebhook_MissingSignatureIsRefused(t *testing.T) {
	t.Setenv("APP_ENV", "staging")
	t.Setenv("ENV", "staging")
	t.Setenv("SHIPBUBBLE_API_KEY_STAGING", "sb_sandbox_test")
	t.Setenv("SHIPBUBBLE_API_URL", "https://api.shipbubble.com/v1")

	rec := postWebhook(t, "", []byte(`{"data":{}}`))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
}
