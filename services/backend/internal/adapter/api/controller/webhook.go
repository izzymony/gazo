package controller

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/shipping"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WebhookController struct {
	service *services.WebhookService
}

func NewWebhookController(db *gorm.DB) *WebhookController {
	return &WebhookController{
		service: services.NewWebhookService(db),
	}
}

func (s *WebhookController) PaystackWebhook(c *gin.Context) {
	logger.Info("PaystackWebhook triggered")

	// Verify webhook signature for security
	receivedSignature := c.GetHeader("x-paystack-signature")
	if receivedSignature == "" {
		logger.Error("Missing Paystack signature header")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
		return
	}

	// Read the raw request body for signature verification
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.Error("Failed to read request body: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read request body"})
		return
	}

	// Get Paystack secret key from environment
	secretKey := os.Getenv("PAYSTACK_SECRET_KEY")
	if secretKey == "" {
		logger.Error("Missing PAYSTACK_SECRET_KEY")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server misconfiguration"})
		return
	}

	// Compute expected signature using HMAC-SHA512
	hasher := hmac.New(sha512.New, []byte(secretKey))
	hasher.Write(body)
	expectedSignature := hex.EncodeToString(hasher.Sum(nil))

	// hmac.Equal, not `!=`: a plain string compare returns as soon as two bytes
	// differ, so how long it takes leaks how much of the signature was right.
	if !hmac.Equal([]byte(receivedSignature), []byte(expectedSignature)) {
		logger.Error("Invalid Paystack signature: Possible security breach")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	// Parse the request body
	var request requests.PaystackWebhookRequest
	if err := json.Unmarshal(body, &request); err != nil {
		logger.Error("Error parsing webhook JSON: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Process the webhook
	err = s.service.PaystackWebhook(request)
	if err != nil {
		logger.Error("error verifying transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}

func (s *WebhookController) ShipbubbleWebhook(c *gin.Context) {
	logger.Info("ShipbubbleWebhook triggered")

	receivedSignature := c.GetHeader("x-ship-signature")
	if receivedSignature == "" {
		logger.Error("Missing signature header")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing signature"})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.Error("Failed to read request body: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read request body"})
		return
	}

	// The webhook HMAC secret is the Shipbubble API key, so it is selected by
	// the SAME canonical-environment rule as the client — one credential, one
	// selection rule.
	//
	// This read `os.Getenv("ENV") == "production"` directly, which is the
	// half-set-deploy hazard helper.ResolveEnv exists for: with
	// APP_ENV=production and ENV unset, production webhooks were verified
	// against the SANDBOX key, so every genuine delivery event would fail its
	// signature check and be discarded.
	shipbubbleCfg, cfgErrs := shipping.ResolveConfig(os.Getenv)
	// FAIL CLOSED. Logging the errors and carrying on "because a key is
	// present" is the dangerous half of a check: a misconfigured environment is
	// precisely the case where the key on hand may be the WRONG key — the
	// sandbox secret verifying production events, or a live secret reached from
	// staging — and a signature computed with the wrong secret does not fail
	// safely, it fails confusingly. Nothing is verified until the configuration
	// itself is sound.
	if len(cfgErrs) > 0 {
		for _, e := range cfgErrs {
			logger.Error("shipbubble webhook configuration: " + e.Error())
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server misconfiguration"})
		return
	}
	secretKey := shipbubbleCfg.APIKey
	if secretKey == "" {
		logger.Error("shipbubble webhook secret is not configured (" + shipbubbleCfg.KeyVar + ")")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server misconfiguration"})
		return
	}

	hasher := hmac.New(sha512.New, []byte(secretKey))
	hasher.Write(body)
	expectedSignature := hex.EncodeToString(hasher.Sum(nil))

	// Constant-time, as above.
	if !hmac.Equal([]byte(receivedSignature), []byte(expectedSignature)) {
		logger.Error("Invalid signature: Possible replay attack")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
		return
	}

	var request requests.ShipbubbleWebhookRequest
	if err := json.Unmarshal(body, &request); err != nil {
		logger.Error("Error parsing JSON: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	err = s.service.ShipbubbleWebhook(request)
	if err != nil {
		logger.Error("Error processing webhook: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Webhook processed successfully",
	})
}

func (s *WebhookController) TwilioMessageStatus(c *gin.Context) {
	var request requests.TwilioMessageStatus

	if err := c.ShouldBind(&request); err != nil {
		logger.Error("Failed to parse form data: " + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	err := s.service.TwilioMessageStatus(request)
	if err != nil {
		logger.Error("error verifying transaction" + err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "successful",
	})
}
