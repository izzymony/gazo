package domain

import "time"

// NotificationLog tracks delivery status and cost for each notification sent
// Used for monitoring, debugging, and cost analysis
type NotificationLog struct {
	Model
	UserID           string  `json:"user_id" gorm:"index;size:100"`
	EventType        string  `json:"event_type" gorm:"index;size:50"`        // e.g., "ORDER_PLACED"
	ReferenceID      string  `json:"reference_id" gorm:"index;size:100"`     // Order ID, etc.
	ReferenceType    string  `json:"reference_type" gorm:"size:50"`          // "order", "withdrawal", "auth"
	RecipientPhone   string  `json:"recipient_phone" gorm:"size:20"`
	RecipientEmail   string  `json:"recipient_email" gorm:"size:100"`

	// Delivery tracking
	ChannelsAttempted StrArray `json:"channels_attempted" gorm:"type:jsonb"` // ["whatsapp", "email", "sms"]
	ChannelDelivered  string   `json:"channel_delivered" gorm:"size:20"`     // Which channel succeeded

	// Status tracking
	Status       string `json:"status" gorm:"index;size:20"`  // pending, sent, delivered, failed
	AttemptCount int    `json:"attempt_count" gorm:"default:0"`

	// WhatsApp specific
	WhatsAppMessageID string `json:"whatsapp_message_id" gorm:"size:100"`
	WhatsAppStatus    string `json:"whatsapp_status" gorm:"size:20"` // sent, delivered, read, failed

	// Cost tracking
	EstimatedCost float64 `json:"estimated_cost" gorm:"type:decimal(10,4)"`

	// Error handling
	LastError      string   `json:"last_error" gorm:"type:text"`
	FailedChannels StrArray `json:"failed_channels" gorm:"type:jsonb"` // ["whatsapp", "email"]

	// Timestamps
	SentAt      *time.Time `json:"sent_at"`
	DeliveredAt *time.Time `json:"delivered_at"`
}

// NotificationStatus represents the delivery status of a notification
type NotificationStatus string

const (
	StatusPending   NotificationStatus = "pending"
	StatusSent      NotificationStatus = "sent"
	StatusDelivered NotificationStatus = "delivered"
	StatusRead      NotificationStatus = "read"
	StatusFailed    NotificationStatus = "failed"
)

// Cost per channel (approximate, for tracking)
const (
	CostWhatsAppUtility       = 0.01   // $0.01 per utility message
	CostWhatsAppAuthentication = 0.004  // $0.004 per auth message
	CostEmail                 = 0.0001 // ~$0.0001 per email
	CostSMS                   = 0.03   // ~$0.03 per SMS (Nigeria)
)
