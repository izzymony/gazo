package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"text/template"
	"time"

	"gorm.io/gorm"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

// Timeout configuration for each channel
const (
	WhatsAppTimeout = 5 * time.Second
	EmailTimeout    = 30 * time.Second
	SMSTimeout      = 10 * time.Second
)

// TransactionalNotificationService handles sending notifications with fallback logic
// Channel priority: WhatsApp -> Email -> SMS
type TransactionalNotificationService struct {
	templateRepo ports.NotificationTemplateInterface
	logRepo      ports.NotificationLogInterface
	prefsRepo    ports.UserNotificationPreferencesInterface
	userRepo     ports.UserRepoInterface
	businessRepo ports.BusinessIface

	// Twilio configuration
	twilioAccountSID        string
	twilioAuthToken         string
	twilioWhatsAppFrom      string
	twilioMessagingService  string

	// SendGrid configuration
	sendGridAPIKey   string
	sendGridFromEmail string
	sendGridFromName  string

	// Feature flag
	enabled bool
}

// NotificationParams contains all data needed to send a notification
type NotificationParams struct {
	UserID        string
	EventType     domain.NotificationEventType
	ReferenceID   string
	ReferenceType string
	Phone         string
	Email         string
	Variables     map[string]string
}

// NewTransactionalNotificationService creates a new notification service
func NewTransactionalNotificationService(db *gorm.DB) *TransactionalNotificationService {
	enabled := os.Getenv("TRANSACTIONAL_NOTIFICATIONS_ENABLED") == "true"

	return &TransactionalNotificationService{
		templateRepo: mysql_repo.NewNotificationTemplateRepository(db),
		logRepo:      mysql_repo.NewNotificationLogRepository(db),
		prefsRepo:    mysql_repo.NewUserNotificationPreferencesRepository(db),
		userRepo:     mysql_repo.NewUserRepository(db),
		businessRepo: mysql_repo.NewBusinessRepository(db),

		twilioAccountSID:       os.Getenv("TWILIO_ACCOUNT_SID"),
		twilioAuthToken:        os.Getenv("TWILIO_AUTH_TOKEN"),
		twilioWhatsAppFrom:     os.Getenv("TWILIO_WHATSAPP_PHONE_NUMBER"),
		twilioMessagingService: os.Getenv("MESSAGING_SERVICE_SID"),

		sendGridAPIKey:    os.Getenv("SENDGRID_API_KEY"),
		sendGridFromEmail: os.Getenv("SENDGRID_FROM_EMAIL"),
		sendGridFromName:  os.Getenv("SENDGRID_FROM_NAME"),

		enabled: enabled,
	}
}

// IsEnabled returns whether the notification service is enabled
func (s *TransactionalNotificationService) IsEnabled() bool {
	return s.enabled
}

// SendWithFallback sends a notification using the fallback chain: WhatsApp -> Email -> SMS
func (s *TransactionalNotificationService) SendWithFallback(ctx context.Context, params NotificationParams) error {
	if !s.enabled {
		logger.Info("Transactional notifications disabled, skipping")
		return nil
	}

	// Create notification log
	notifLog := &domain.NotificationLog{
		UserID:           params.UserID,
		EventType:        string(params.EventType),
		ReferenceID:      params.ReferenceID,
		ReferenceType:    params.ReferenceType,
		RecipientPhone:   params.Phone,
		RecipientEmail:   params.Email,
		Status:           string(domain.StatusPending),
		ChannelsAttempted: domain.StrArray{},
		FailedChannels:   domain.StrArray{},
	}

	if err := s.logRepo.Create(notifLog); err != nil {
		logger.Error(fmt.Sprintf("Failed to create notification log: %v", err))
	}

	// Get user preferences
	prefs, err := s.prefsRepo.GetOrCreate(params.UserID)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to get user preferences: %v", err))
		prefs = domain.DefaultNotificationPreferences(params.UserID)
	}

	// Check if category is enabled
	if !prefs.IsCategoryEnabled(params.EventType) {
		notifLog.Status = "skipped_by_preference"
		s.logRepo.Update(notifLog)
		return nil
	}

	// Try each channel in priority order
	for _, channel := range domain.ChannelPriority {
		// Check if channel is enabled for user
		if !prefs.IsChannelEnabled(channel) {
			continue
		}

		// Check if we have the required contact info for this channel
		if !s.hasContactInfo(params, channel) {
			continue
		}

		notifLog.ChannelsAttempted = append(notifLog.ChannelsAttempted, string(channel))

		// Try sending via this channel
		err := s.tryChannel(ctx, channel, params, notifLog)
		if err == nil {
			notifLog.ChannelDelivered = string(channel)
			notifLog.Status = string(domain.StatusSent)
			now := time.Now()
			notifLog.SentAt = &now
			s.logRepo.Update(notifLog)
			logger.Info(fmt.Sprintf("Notification sent via %s for event %s", channel, params.EventType))
			return nil
		}

		// Log failed attempt
		notifLog.AttemptCount++
		notifLog.FailedChannels = append(notifLog.FailedChannels, string(channel))
		notifLog.LastError = err.Error()
		logger.Error(fmt.Sprintf("Failed to send via %s: %v, trying next channel", channel, err))
	}

	// All channels failed
	notifLog.Status = string(domain.StatusFailed)
	s.logRepo.Update(notifLog)
	return errors.New("all notification channels failed")
}

// hasContactInfo checks if we have the required contact info for a channel
func (s *TransactionalNotificationService) hasContactInfo(params NotificationParams, channel domain.NotificationChannel) bool {
	switch channel {
	case domain.ChannelWhatsApp, domain.ChannelSMS:
		return params.Phone != ""
	case domain.ChannelEmail:
		return params.Email != ""
	}
	return false
}

// tryChannel attempts to send via a specific channel with timeout
func (s *TransactionalNotificationService) tryChannel(ctx context.Context, channel domain.NotificationChannel, params NotificationParams, notifLog *domain.NotificationLog) error {
	var timeout time.Duration
	switch channel {
	case domain.ChannelWhatsApp:
		timeout = WhatsAppTimeout
	case domain.ChannelEmail:
		timeout = EmailTimeout
	case domain.ChannelSMS:
		timeout = SMSTimeout
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// Get template for this event and channel
	tmpl, err := s.templateRepo.GetByEventAndChannel(string(params.EventType), string(channel))
	if err != nil {
		return fmt.Errorf("template not found: %w", err)
	}

	// Render template with variables
	body, err := s.renderTemplate(tmpl.Body, params.Variables)
	if err != nil {
		return fmt.Errorf("failed to render template: %w", err)
	}

	// Send via the appropriate channel
	switch channel {
	case domain.ChannelWhatsApp:
		notifLog.EstimatedCost = s.getEstimatedCost(params.EventType, channel)
		return s.sendWhatsApp(ctx, params.Phone, tmpl.WhatsAppTemplateID, params.Variables, notifLog)
	case domain.ChannelEmail:
		notifLog.EstimatedCost = domain.CostEmail
		subject, _ := s.renderTemplate(tmpl.Subject, params.Variables)
		return s.sendEmail(ctx, params.Email, subject, body)
	case domain.ChannelSMS:
		notifLog.EstimatedCost = domain.CostSMS
		return s.sendSMS(ctx, params.Phone, body)
	}

	return errors.New("unknown channel")
}

// getEstimatedCost returns the estimated cost for a notification
func (s *TransactionalNotificationService) getEstimatedCost(eventType domain.NotificationEventType, channel domain.NotificationChannel) float64 {
	if channel != domain.ChannelWhatsApp {
		return 0
	}

	// Authentication messages are cheaper
	switch eventType {
	case domain.EventPasswordResetOTP, domain.EventWithdrawalOTP:
		return domain.CostWhatsAppAuthentication
	default:
		return domain.CostWhatsAppUtility
	}
}

// renderTemplate renders a template string with variables
func (s *TransactionalNotificationService) renderTemplate(templateStr string, variables map[string]string) (string, error) {
	// Replace {{variable}} style placeholders
	result := templateStr
	for key, value := range variables {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}

	// Also support Go template syntax
	tmpl, err := template.New("notification").Parse(result)
	if err != nil {
		return result, nil // Return as-is if template parsing fails
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, variables); err != nil {
		return result, nil
	}

	return buf.String(), nil
}

// sendWhatsApp sends a WhatsApp message via Twilio
func (s *TransactionalNotificationService) sendWhatsApp(ctx context.Context, phone, templateID string, variables map[string]string, notifLog *domain.NotificationLog) error {
	if s.twilioAccountSID == "" || s.twilioAuthToken == "" {
		return errors.New("twilio credentials not configured")
	}

	twilioURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.twilioAccountSID)

	// Convert variables to WhatsApp content variables format ({{1}}, {{2}}, etc.)
	contentVars := s.buildWhatsAppContentVars(variables)

	form := url.Values{}
	form.Set("To", fmt.Sprintf("whatsapp:%s", phone))
	form.Set("From", fmt.Sprintf("whatsapp:%s", s.twilioWhatsAppFrom))
	if templateID != "" {
		form.Set("ContentSid", templateID)
		form.Set("ContentVariables", contentVars)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", twilioURL, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(s.twilioAccountSID, s.twilioAuthToken)
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 300 {
		return fmt.Errorf("twilio API error: %s - %s", resp.Status, string(bodyBytes))
	}

	// Parse response to get message SID
	var twilioResp struct {
		Sid    string `json:"sid"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(bodyBytes, &twilioResp); err == nil {
		notifLog.WhatsAppMessageID = twilioResp.Sid
		notifLog.WhatsAppStatus = twilioResp.Status
	}

	return nil
}

// buildWhatsAppContentVars converts named variables to positional format
func (s *TransactionalNotificationService) buildWhatsAppContentVars(variables map[string]string) string {
	// Map of common variable names to positions
	// WhatsApp templates use {{1}}, {{2}}, etc.
	varOrder := []string{"name", "buyer_name", "seller_name", "order_id", "store_name", "amount", "tracking_url", "otp_code"}

	result := make(map[string]string)
	pos := 1
	for _, key := range varOrder {
		if val, ok := variables[key]; ok {
			result[fmt.Sprintf("%d", pos)] = val
			pos++
		}
	}

	// Add any remaining variables
	for key, val := range variables {
		found := false
		for _, ordered := range varOrder {
			if key == ordered {
				found = true
				break
			}
		}
		if !found {
			result[fmt.Sprintf("%d", pos)] = val
			pos++
		}
	}

	jsonBytes, _ := json.Marshal(result)
	return string(jsonBytes)
}

// sendEmail sends an email via SendGrid
func (s *TransactionalNotificationService) sendEmail(ctx context.Context, to, subject, body string) error {
	if s.sendGridAPIKey == "" {
		return errors.New("sendgrid API key not configured")
	}

	payload := map[string]interface{}{
		"personalizations": []map[string]interface{}{
			{
				"to": []map[string]string{
					{"email": to},
				},
				"subject": subject,
			},
		},
		"from": map[string]string{
			"email": s.sendGridFromEmail,
			"name":  s.sendGridFromName,
		},
		"content": []map[string]string{
			{
				"type":  "text/html",
				"value": body,
			},
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.sendgrid.com/v3/mail/send", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.sendGridAPIKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sendgrid API error: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}

// sendSMS sends an SMS via Twilio
func (s *TransactionalNotificationService) sendSMS(ctx context.Context, phone, body string) error {
	if s.twilioAccountSID == "" || s.twilioAuthToken == "" {
		return errors.New("twilio credentials not configured")
	}

	twilioURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.twilioAccountSID)

	form := url.Values{}
	form.Set("To", phone)
	form.Set("Body", body)
	form.Set("MessagingServiceSid", s.twilioMessagingService)

	req, err := http.NewRequestWithContext(ctx, "POST", twilioURL, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	auth := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", s.twilioAccountSID, s.twilioAuthToken)))
	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", auth))
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("twilio API error: %s - %s", resp.Status, string(bodyBytes))
	}

	return nil
}

// ============================================
// High-Level Notification Methods
// ============================================

// SendOrderConfirmation sends order confirmation to buyer
func (s *TransactionalNotificationService) SendOrderConfirmation(ctx context.Context, orderID, buyerID, buyerPhone, buyerEmail, storeName, amount, trackingURL string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        buyerID,
		EventType:     domain.EventOrderPlaced,
		ReferenceID:   orderID,
		ReferenceType: "order",
		Phone:         buyerPhone,
		Email:         buyerEmail,
		Variables: map[string]string{
			"buyer_name":   "", // Will be filled from user data
			"order_id":     orderID,
			"store_name":   storeName,
			"amount":       amount,
			"tracking_url": trackingURL,
		},
	})
}

// SendNewOrderToSeller alerts seller about new order
func (s *TransactionalNotificationService) SendNewOrderToSeller(ctx context.Context, orderID, sellerID, sellerPhone, sellerEmail, buyerName, itemCount, amount, orderURL string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        sellerID,
		EventType:     domain.EventNewOrderSeller,
		ReferenceID:   orderID,
		ReferenceType: "order",
		Phone:         sellerPhone,
		Email:         sellerEmail,
		Variables: map[string]string{
			"seller_name": "", // Will be filled from user data
			"buyer_name":  buyerName,
			"item_count":  itemCount,
			"amount":      amount,
			"order_url":   orderURL,
		},
	})
}

// SendShippingUpdate notifies buyer about shipping status
func (s *TransactionalNotificationService) SendShippingUpdate(ctx context.Context, orderID, buyerID, buyerPhone, buyerEmail, trackingURL, deliveryDate string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        buyerID,
		EventType:     domain.EventOrderShipped,
		ReferenceID:   orderID,
		ReferenceType: "order",
		Phone:         buyerPhone,
		Email:         buyerEmail,
		Variables: map[string]string{
			"order_id":      orderID,
			"tracking_url":  trackingURL,
			"delivery_date": deliveryDate,
		},
	})
}

// SendPasswordResetOTP sends password reset OTP
func (s *TransactionalNotificationService) SendPasswordResetOTP(ctx context.Context, userID, phone, email, otpCode string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        userID,
		EventType:     domain.EventPasswordResetOTP,
		ReferenceID:   "",
		ReferenceType: "auth",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"otp_code": otpCode,
		},
	})
}

// SendWithdrawalOTP sends withdrawal OTP to seller
func (s *TransactionalNotificationService) SendWithdrawalOTP(ctx context.Context, userID, phone, email, otpCode, amount string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        userID,
		EventType:     domain.EventWithdrawalOTP,
		ReferenceID:   "",
		ReferenceType: "withdrawal",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"otp_code": otpCode,
			"amount":   amount,
		},
	})
}

// SendSellerLoginAlert notifies seller about new login
func (s *TransactionalNotificationService) SendSellerLoginAlert(ctx context.Context, sellerID, phone, email, deviceInfo, loginTime, location string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        sellerID,
		EventType:     domain.EventSellerLoginAlert,
		ReferenceID:   "",
		ReferenceType: "security",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"device_info": deviceInfo,
			"time":        loginTime,
			"location":    location,
		},
	})
}

// SendLowStockAlert notifies seller about low stock
func (s *TransactionalNotificationService) SendLowStockAlert(ctx context.Context, sellerID, phone, email, productName, quantityRemaining string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        sellerID,
		EventType:     domain.EventLowStock,
		ReferenceID:   "",
		ReferenceType: "inventory",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"product_name":       productName,
			"quantity_remaining": quantityRemaining,
		},
	})
}

// SendPayoutReady notifies seller about available payout
func (s *TransactionalNotificationService) SendPayoutReady(ctx context.Context, sellerID, phone, email, amount, payoutURL string) error {
	return s.SendWithFallback(ctx, NotificationParams{
		UserID:        sellerID,
		EventType:     domain.EventPayoutReady,
		ReferenceID:   "",
		ReferenceType: "payout",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"amount":     amount,
			"payout_url": payoutURL,
		},
	})
}
