package controller

import (
	"net/http"
	"os"
	"strings"
	"time"

	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// WhatsAppWebhookController handles WhatsApp status webhooks from Meta/Twilio
type WhatsAppWebhookController struct {
	logRepo ports.NotificationLogInterface
}

// NewWhatsAppWebhookController creates a new WhatsApp webhook controller
func NewWhatsAppWebhookController(db *gorm.DB) *WhatsAppWebhookController {
	return &WhatsAppWebhookController{
		logRepo: mysql_repo.NewNotificationLogRepository(db),
	}
}

// WhatsAppWebhookPayload represents the incoming webhook from Meta
type WhatsAppWebhookPayload struct {
	Object string `json:"object"`
	Entry  []struct {
		ID      string `json:"id"`
		Changes []struct {
			Value struct {
				MessagingProduct string `json:"messaging_product"`
				Metadata         struct {
					DisplayPhoneNumber string `json:"display_phone_number"`
					PhoneNumberID      string `json:"phone_number_id"`
				} `json:"metadata"`
				Statuses []WhatsAppStatus `json:"statuses"`
			} `json:"value"`
			Field string `json:"field"`
		} `json:"changes"`
	} `json:"entry"`
}

// WhatsAppStatus represents a message status update
type WhatsAppStatus struct {
	ID           string `json:"id"`
	Status       string `json:"status"` // sent, delivered, read, failed
	Timestamp    string `json:"timestamp"`
	RecipientID  string `json:"recipient_id"`
	Conversation *struct {
		ID     string `json:"id"`
		Origin struct {
			Type string `json:"type"`
		} `json:"origin"`
	} `json:"conversation,omitempty"`
	Pricing *struct {
		Billable     bool   `json:"billable"`
		PricingModel string `json:"pricing_model"`
		Category     string `json:"category"`
	} `json:"pricing,omitempty"`
	Errors []struct {
		Code    int    `json:"code"`
		Title   string `json:"title"`
		Message string `json:"message"`
	} `json:"errors,omitempty"`
}

// VerifyWebhook handles the webhook verification challenge from Meta
// GET /webhooks/whatsapp
func (h *WhatsAppWebhookController) VerifyWebhook(c *gin.Context) {
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")

	// The verify token is a shared secret with Meta. A hardcoded default is only
	// acceptable locally — in staging/production an unset variable must FAIL the
	// handshake rather than fall back to a value that is public in this repo.
	verifyToken := os.Getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN")
	if verifyToken == "" {
		if !isLocalWhatsAppEnv() {
			logger.Error("WHATSAPP_WEBHOOK_VERIFY_TOKEN is not set; refusing webhook verification outside local")
			c.JSON(http.StatusForbidden, gin.H{"error": "Verification failed"})
			return
		}
		verifyToken = "vibaar_local_webhook_verify_token" // local development only
	}

	if mode == "subscribe" && token == verifyToken {
		logger.Info("WhatsApp webhook verified successfully")
		c.String(http.StatusOK, challenge)
		return
	}

	logger.Error("WhatsApp webhook verification failed")
	c.JSON(http.StatusForbidden, gin.H{"error": "Verification failed"})
}

// HandleStatusUpdate processes WhatsApp message status updates
// POST /webhooks/whatsapp
func (h *WhatsAppWebhookController) HandleStatusUpdate(c *gin.Context) {
	var payload WhatsAppWebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		logger.Error("Failed to parse WhatsApp webhook payload: " + err.Error())
		// Always return 200 to Meta to acknowledge receipt
		c.Status(http.StatusOK)
		return
	}

	// Process each status update
	for _, entry := range payload.Entry {
		for _, change := range entry.Changes {
			if change.Field == "messages" {
				for _, status := range change.Value.Statuses {
					h.processStatus(status)
				}
			}
		}
	}

	// Always return 200 to acknowledge webhook
	c.Status(http.StatusOK)
}

// processStatus updates the notification log based on WhatsApp status
func (h *WhatsAppWebhookController) processStatus(status WhatsAppStatus) {
	// Find the notification log by WhatsApp message ID
	notifLog, err := h.logRepo.GetByWhatsAppMessageID(status.ID)
	if err != nil {
		logger.Error("Notification log not found for WhatsApp message: " + status.ID)
		return
	}

	// Update the status
	notifLog.WhatsAppStatus = status.Status

	switch status.Status {
	case "sent":
		notifLog.Status = string(domain.StatusSent)
		now := time.Now()
		notifLog.SentAt = &now
		logger.Info("WhatsApp message sent: " + status.ID)

	case "delivered":
		notifLog.Status = string(domain.StatusDelivered)
		now := time.Now()
		notifLog.DeliveredAt = &now
		logger.Info("WhatsApp message delivered: " + status.ID)

	case "read":
		notifLog.Status = string(domain.StatusRead)
		logger.Info("WhatsApp message read: " + status.ID)

	case "failed":
		notifLog.Status = string(domain.StatusFailed)
		if len(status.Errors) > 0 {
			notifLog.LastError = status.Errors[0].Message
		}
		logger.Error("WhatsApp message failed: " + status.ID)
	}

	// Save the updated log
	if err := h.logRepo.Update(notifLog); err != nil {
		logger.Error("Failed to update notification log: " + err.Error())
	}
}

// TwilioStatusCallback handles Twilio status callback webhooks
// POST /webhooks/twilio/status
func (h *WhatsAppWebhookController) TwilioStatusCallback(c *gin.Context) {
	messageSID := c.PostForm("MessageSid")
	messageStatus := c.PostForm("MessageStatus")
	errorCode := c.PostForm("ErrorCode")
	errorMessage := c.PostForm("ErrorMessage")

	if messageSID == "" {
		c.Status(http.StatusOK)
		return
	}

	// Find the notification log by Twilio message SID
	notifLog, err := h.logRepo.GetByWhatsAppMessageID(messageSID)
	if err != nil {
		logger.Error("Notification log not found for Twilio message: " + messageSID)
		c.Status(http.StatusOK)
		return
	}

	// Update status based on Twilio callback
	switch messageStatus {
	case "queued", "sending":
		notifLog.Status = string(domain.StatusPending)
	case "sent":
		notifLog.Status = string(domain.StatusSent)
		now := time.Now()
		notifLog.SentAt = &now
	case "delivered":
		notifLog.Status = string(domain.StatusDelivered)
		now := time.Now()
		notifLog.DeliveredAt = &now
	case "read":
		notifLog.Status = string(domain.StatusRead)
	case "failed", "undelivered":
		notifLog.Status = string(domain.StatusFailed)
		if errorMessage != "" {
			notifLog.LastError = errorCode + ": " + errorMessage
		}
	}

	notifLog.WhatsAppStatus = messageStatus

	if err := h.logRepo.Update(notifLog); err != nil {
		logger.Error("Failed to update notification log: " + err.Error())
	}

	c.Status(http.StatusOK)
}

// isLocalWhatsAppEnv mirrors routes.isLocalEnv (APP_ENV / ENV in {local, dev,
// development}), which is unexported in its own package. Kept local to this file
// so the WhatsApp verify-token fallback can never apply in staging/production.
func isLocalWhatsAppEnv() bool {
	for _, v := range []string{os.Getenv("APP_ENV"), os.Getenv("ENV")} {
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "local", "dev", "development":
			return true
		}
	}
	return false
}
