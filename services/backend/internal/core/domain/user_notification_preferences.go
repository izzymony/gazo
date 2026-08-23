package domain

// UserNotificationPreferences stores user preferences for notification channels and types
// Users can opt-out of specific channels or notification categories
type UserNotificationPreferences struct {
	Model
	UserID string `json:"user_id" gorm:"uniqueIndex;size:100"`

	// Channel preferences (user can opt-out)
	WhatsAppEnabled bool `json:"whatsapp_enabled" gorm:"default:true"`
	EmailEnabled    bool `json:"email_enabled" gorm:"default:true"`
	SMSEnabled      bool `json:"sms_enabled" gorm:"default:true"`

	// Category preferences
	OrderUpdates        bool `json:"order_updates" gorm:"default:true"`         // Order lifecycle notifications
	SellerAlerts        bool `json:"seller_alerts" gorm:"default:true"`         // New orders, low stock, payouts
	SecurityAlerts      bool `json:"security_alerts" gorm:"default:true"`       // Login alerts, password reset
	PromotionalMessages bool `json:"promotional_messages" gorm:"default:false"` // Marketing (opt-in only)
}

// IsChannelEnabled checks if a specific channel is enabled for the user
func (p *UserNotificationPreferences) IsChannelEnabled(channel NotificationChannel) bool {
	switch channel {
	case ChannelWhatsApp:
		return p.WhatsAppEnabled
	case ChannelEmail:
		return p.EmailEnabled
	case ChannelSMS:
		return p.SMSEnabled
	default:
		return false
	}
}

// IsCategoryEnabled checks if a notification category is enabled for the user
func (p *UserNotificationPreferences) IsCategoryEnabled(eventType NotificationEventType) bool {
	switch eventType {
	// Order lifecycle
	case EventOrderPlaced, EventOrderConfirmed, EventOrderShipped,
		EventOrderOutDelivery, EventOrderDelivered, EventOrderCancelled, EventRefundProcessed:
		return p.OrderUpdates

	// Seller alerts
	case EventNewOrderSeller, EventOrderReminder, EventLowStock,
		EventPayoutReady, EventPaymentReceived, EventCustomerReview:
		return p.SellerAlerts

	// Security alerts (always enabled, cannot be disabled)
	case EventPasswordResetOTP, EventWithdrawalOTP, EventSellerLoginAlert:
		return true // Security alerts are mandatory

	// Welcome message
	case EventWelcome:
		return true // Welcome is mandatory

	default:
		return true
	}
}

// DefaultNotificationPreferences returns default preferences for new users
func DefaultNotificationPreferences(userID string) *UserNotificationPreferences {
	return &UserNotificationPreferences{
		UserID:              userID,
		WhatsAppEnabled:     true,
		EmailEnabled:        true,
		SMSEnabled:          true,
		OrderUpdates:        true,
		SellerAlerts:        true,
		SecurityAlerts:      true,
		PromotionalMessages: false,
	}
}
