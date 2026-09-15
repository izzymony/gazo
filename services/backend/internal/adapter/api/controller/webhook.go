package controller

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
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

	secretKey := os.Getenv("SHIPBUBBLE_API_KEY_STAGING")
	if os.Getenv("ENV") == "production" {
		secretKey = os.Getenv("SHIPBUBBLE_API_KEY_PROD")
	}
	if secretKey == "" {
		logger.Error("Missing SHIPBUBBLE_SECRET_KEY")
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
