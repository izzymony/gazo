package domain

// NotificationTemplate stores message templates for transactional notifications
// Templates support WhatsApp, Email, and SMS channels with variable placeholders
type NotificationTemplate struct {
	Model
	Name               string `json:"name" gorm:"uniqueIndex;size:100"`           // e.g., "order_confirmation"
	EventType          string `json:"event_type" gorm:"index;size:50"`            // e.g., "ORDER_PLACED"
	Channel            string `json:"channel" gorm:"index;size:20"`               // "whatsapp", "email", "sms"
	Subject            string `json:"subject" gorm:"size:255"`                    // Email subject line
	Body               string `json:"body" gorm:"type:text"`                      // Template body with {{variables}}
	WhatsAppTemplateID string `json:"whatsapp_template_id" gorm:"size:100"`       // Meta-approved template ID
	Variables          Map    `json:"variables" gorm:"type:jsonb"`                // Required variables schema
	IsActive           bool   `json:"is_active" gorm:"default:true"`              // Enable/disable template
	Priority           int    `json:"priority" gorm:"default:1"`                  // Channel priority (1=WA, 2=Email, 3=SMS)
}

// NotificationChannel represents supported notification channels
type NotificationChannel string

const (
	ChannelWhatsApp NotificationChannel = "whatsapp"
	ChannelEmail    NotificationChannel = "email"
	ChannelSMS      NotificationChannel = "sms"
)

// NotificationEventType represents supported notification events
type NotificationEventType string

const (
	// Order Lifecycle - Buyer
	EventOrderPlaced       NotificationEventType = "ORDER_PLACED"
	EventOrderConfirmed    NotificationEventType = "ORDER_CONFIRMED"
	EventOrderShipped      NotificationEventType = "ORDER_SHIPPED"
	EventOrderOutDelivery  NotificationEventType = "ORDER_OUT_FOR_DELIVERY"
	EventOrderDelivered    NotificationEventType = "ORDER_DELIVERED"
	EventOrderCancelled    NotificationEventType = "ORDER_CANCELLED"
	EventRefundProcessed   NotificationEventType = "REFUND_PROCESSED"

	// Seller Notifications
	EventNewOrderSeller    NotificationEventType = "NEW_ORDER_SELLER"
	EventOrderReminder     NotificationEventType = "ORDER_REMINDER"
	EventLowStock          NotificationEventType = "LOW_STOCK"
	EventPayoutReady       NotificationEventType = "PAYOUT_READY"
	EventPaymentReceived   NotificationEventType = "PAYMENT_RECEIVED"
	EventCustomerReview    NotificationEventType = "CUSTOMER_REVIEW"

	// Account & Security
	EventWelcome           NotificationEventType = "WELCOME"
	EventPasswordResetOTP  NotificationEventType = "PASSWORD_RESET_OTP"
	EventWithdrawalOTP     NotificationEventType = "WITHDRAWAL_OTP"
	EventSellerLoginAlert  NotificationEventType = "SELLER_LOGIN_ALERT"
)

// ChannelPriority defines the fallback order: WhatsApp -> Email -> SMS
var ChannelPriority = []NotificationChannel{
	ChannelWhatsApp,
	ChannelEmail,
	ChannelSMS,
}
