package seeder

import (
	"fmt"

	"gorm.io/gorm"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/logger"
)

// SeedNotificationTemplates seeds the default notification templates
func SeedNotificationTemplates(db *gorm.DB) error {
	logger.Info("Seeding notification templates...")

	templates := []domain.NotificationTemplate{
		// ============================================
		// ORDER LIFECYCLE - BUYER NOTIFICATIONS
		// ============================================

		// Order Placed - WhatsApp
		{
			Name:               "order_placed_buyer_whatsapp",
			EventType:          string(domain.EventOrderPlaced),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "Hi {{buyer_name}}! 🎉\n\nYour order #{{order_id}} from {{store_name}} is confirmed!\n\n💰 Total: {{amount}}\n📦 Track your order: {{tracking_url}}\n\nThank you for shopping with Vibaar!",
			WhatsAppTemplateID: "", // To be filled when Meta approves template
			Variables:          domain.Map{"buyer_name": "string", "order_id": "string", "store_name": "string", "amount": "string", "tracking_url": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Order Placed - Email
		{
			Name:      "order_placed_buyer_email",
			EventType: string(domain.EventOrderPlaced),
			Channel:   string(domain.ChannelEmail),
			Subject:   "Order Confirmed - #{{order_id}} from {{store_name}}",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#f8f9fa;padding:20px;text-align:center}.content{padding:20px}.btn{background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block}</style></head>
<body>
<div class="header"><h1>Order Confirmed! 🎉</h1></div>
<div class="content">
<p>Hi {{buyer_name}},</p>
<p>Your order <strong>#{{order_id}}</strong> from <strong>{{store_name}}</strong> has been confirmed!</p>
<p><strong>Total:</strong> {{amount}}</p>
<p><a href="{{tracking_url}}" class="btn">Track Your Order</a></p>
<p>Thank you for shopping with Vibaar!</p>
</div>
</body>
</html>`,
			Variables: domain.Map{"buyer_name": "string", "order_id": "string", "store_name": "string", "amount": "string", "tracking_url": "string"},
			IsActive:  true,
			Priority:  2,
		},
		// Order Placed - SMS
		{
			Name:      "order_placed_buyer_sms",
			EventType: string(domain.EventOrderPlaced),
			Channel:   string(domain.ChannelSMS),
			Subject:   "",
			Body:      "Vibaar: Order #{{order_id}} confirmed! Total: {{amount}}. Track: {{tracking_url}}",
			Variables: domain.Map{"order_id": "string", "amount": "string", "tracking_url": "string"},
			IsActive:  true,
			Priority:  3,
		},

		// Order Shipped - WhatsApp
		{
			Name:               "order_shipped_buyer_whatsapp",
			EventType:          string(domain.EventOrderShipped),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "📦 Your order #{{order_id}} is on its way!\n\nEstimated delivery: {{delivery_date}}\n🔗 Track: {{tracking_url}}",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"order_id": "string", "delivery_date": "string", "tracking_url": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Order Shipped - Email
		{
			Name:      "order_shipped_buyer_email",
			EventType: string(domain.EventOrderShipped),
			Channel:   string(domain.ChannelEmail),
			Subject:   "Your Order #{{order_id}} Has Shipped! 📦",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#28a745;color:white;padding:20px;text-align:center}.content{padding:20px}.btn{background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block}</style></head>
<body>
<div class="header"><h1>Your Order Has Shipped! 📦</h1></div>
<div class="content">
<p>Great news! Your order <strong>#{{order_id}}</strong> is on its way.</p>
<p><strong>Estimated Delivery:</strong> {{delivery_date}}</p>
<p><a href="{{tracking_url}}" class="btn">Track Your Order</a></p>
</div>
</body>
</html>`,
			Variables: domain.Map{"order_id": "string", "delivery_date": "string", "tracking_url": "string"},
			IsActive:  true,
			Priority:  2,
		},
		// Order Shipped - SMS
		{
			Name:      "order_shipped_buyer_sms",
			EventType: string(domain.EventOrderShipped),
			Channel:   string(domain.ChannelSMS),
			Subject:   "",
			Body:      "Vibaar: Order #{{order_id}} shipped! Est. delivery: {{delivery_date}}. Track: {{tracking_url}}",
			Variables: domain.Map{"order_id": "string", "delivery_date": "string", "tracking_url": "string"},
			IsActive:  true,
			Priority:  3,
		},

		// ============================================
		// ORDER LIFECYCLE - SELLER NOTIFICATIONS
		// ============================================

		// New Order - Seller WhatsApp
		{
			Name:               "new_order_seller_whatsapp",
			EventType:          string(domain.EventNewOrderSeller),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "🔔 New Order Alert!\n\nYou have a new order!\n\n👤 Buyer: {{buyer_name}}\n📦 Items: {{item_count}}\n💰 Amount: {{amount}}\n\nView details: {{order_url}}\n\nPlease confirm within 24 hours.",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"seller_name": "string", "buyer_name": "string", "item_count": "string", "amount": "string", "order_url": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// New Order - Seller Email
		{
			Name:      "new_order_seller_email",
			EventType: string(domain.EventNewOrderSeller),
			Channel:   string(domain.ChannelEmail),
			Subject:   "🔔 New Order Received - {{amount}}",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#ffc107;padding:20px;text-align:center}.content{padding:20px}.btn{background:#28a745;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block}</style></head>
<body>
<div class="header"><h1>New Order Alert! 🔔</h1></div>
<div class="content">
<p>You have a new order!</p>
<p><strong>Buyer:</strong> {{buyer_name}}</p>
<p><strong>Items:</strong> {{item_count}}</p>
<p><strong>Amount:</strong> {{amount}}</p>
<p><a href="{{order_url}}" class="btn">View Order Details</a></p>
<p><em>Please confirm within 24 hours.</em></p>
</div>
</body>
</html>`,
			Variables: domain.Map{"buyer_name": "string", "item_count": "string", "amount": "string", "order_url": "string"},
			IsActive:  true,
			Priority:  2,
		},
		// New Order - Seller SMS
		{
			Name:      "new_order_seller_sms",
			EventType: string(domain.EventNewOrderSeller),
			Channel:   string(domain.ChannelSMS),
			Subject:   "",
			Body:      "Vibaar: New order from {{buyer_name}}! Amount: {{amount}}. View: {{order_url}}",
			Variables: domain.Map{"buyer_name": "string", "amount": "string", "order_url": "string"},
			IsActive:  true,
			Priority:  3,
		},

		// ============================================
		// SECURITY NOTIFICATIONS
		// ============================================

		// Password Reset OTP - WhatsApp
		{
			Name:               "password_reset_otp_whatsapp",
			EventType:          string(domain.EventPasswordResetOTP),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "🔐 Your password reset code is: {{otp_code}}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore.",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"otp_code": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Password Reset OTP - Email
		{
			Name:      "password_reset_otp_email",
			EventType: string(domain.EventPasswordResetOTP),
			Channel:   string(domain.ChannelEmail),
			Subject:   "Password Reset Code - Vibaar",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#dc3545;color:white;padding:20px;text-align:center}.content{padding:20px;text-align:center}.code{font-size:32px;font-weight:bold;letter-spacing:8px;background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0}</style></head>
<body>
<div class="header"><h1>Password Reset 🔐</h1></div>
<div class="content">
<p>Your password reset code is:</p>
<div class="code">{{otp_code}}</div>
<p>This code expires in 10 minutes.</p>
<p><em>If you didn't request this, please ignore this email.</em></p>
</div>
</body>
</html>`,
			Variables: domain.Map{"otp_code": "string"},
			IsActive:  true,
			Priority:  2,
		},
		// Password Reset OTP - SMS
		{
			Name:      "password_reset_otp_sms",
			EventType: string(domain.EventPasswordResetOTP),
			Channel:   string(domain.ChannelSMS),
			Subject:   "",
			Body:      "Vibaar: Your password reset code is {{otp_code}}. Expires in 10 mins.",
			Variables: domain.Map{"otp_code": "string"},
			IsActive:  true,
			Priority:  3,
		},

		// Withdrawal OTP - WhatsApp
		{
			Name:               "withdrawal_otp_whatsapp",
			EventType:          string(domain.EventWithdrawalOTP),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "💰 Withdrawal Request\n\nYour withdrawal verification code is: {{otp_code}}\n\nAmount: {{amount}}\n\nThis code expires in 10 minutes.",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"otp_code": "string", "amount": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Withdrawal OTP - Email
		{
			Name:      "withdrawal_otp_email",
			EventType: string(domain.EventWithdrawalOTP),
			Channel:   string(domain.ChannelEmail),
			Subject:   "Withdrawal Verification Code - Vibaar",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#28a745;color:white;padding:20px;text-align:center}.content{padding:20px;text-align:center}.code{font-size:32px;font-weight:bold;letter-spacing:8px;background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0}</style></head>
<body>
<div class="header"><h1>Withdrawal Verification 💰</h1></div>
<div class="content">
<p>Your withdrawal verification code is:</p>
<div class="code">{{otp_code}}</div>
<p><strong>Amount:</strong> {{amount}}</p>
<p>This code expires in 10 minutes.</p>
</div>
</body>
</html>`,
			Variables: domain.Map{"otp_code": "string", "amount": "string"},
			IsActive:  true,
			Priority:  2,
		},
		// Withdrawal OTP - SMS
		{
			Name:      "withdrawal_otp_sms",
			EventType: string(domain.EventWithdrawalOTP),
			Channel:   string(domain.ChannelSMS),
			Subject:   "",
			Body:      "Vibaar: Withdrawal code {{otp_code}} for {{amount}}. Expires in 10 mins.",
			Variables: domain.Map{"otp_code": "string", "amount": "string"},
			IsActive:  true,
			Priority:  3,
		},

		// Seller Login Alert - WhatsApp
		{
			Name:               "seller_login_alert_whatsapp",
			EventType:          string(domain.EventSellerLoginAlert),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "⚠️ New Login Detected\n\nDevice: {{device_info}}\nTime: {{time}}\nLocation: {{location}}\n\nIf this wasn't you, please secure your account immediately.",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"device_info": "string", "time": "string", "location": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Seller Login Alert - Email
		{
			Name:      "seller_login_alert_email",
			EventType: string(domain.EventSellerLoginAlert),
			Channel:   string(domain.ChannelEmail),
			Subject:   "⚠️ New Login to Your Vibaar Account",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#ffc107;padding:20px;text-align:center}.content{padding:20px}.alert{background:#fff3cd;border:1px solid #ffeeba;padding:15px;border-radius:4px;margin:15px 0}</style></head>
<body>
<div class="header"><h1>New Login Detected ⚠️</h1></div>
<div class="content">
<div class="alert">
<p><strong>Device:</strong> {{device_info}}</p>
<p><strong>Time:</strong> {{time}}</p>
<p><strong>Location:</strong> {{location}}</p>
</div>
<p>If this wasn't you, please secure your account immediately by changing your password.</p>
</div>
</body>
</html>`,
			Variables: domain.Map{"device_info": "string", "time": "string", "location": "string"},
			IsActive:  true,
			Priority:  2,
		},
		// Seller Login Alert - SMS
		{
			Name:      "seller_login_alert_sms",
			EventType: string(domain.EventSellerLoginAlert),
			Channel:   string(domain.ChannelSMS),
			Subject:   "",
			Body:      "Vibaar: New login from {{device_info}} at {{time}}. Not you? Secure your account now.",
			Variables: domain.Map{"device_info": "string", "time": "string"},
			IsActive:  true,
			Priority:  3,
		},

		// ============================================
		// SELLER ALERTS
		// ============================================

		// Low Stock Alert - WhatsApp
		{
			Name:               "low_stock_alert_whatsapp",
			EventType:          string(domain.EventLowStock),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "⚠️ Low Stock Alert\n\nProduct: {{product_name}}\nRemaining: {{quantity_remaining}} units\n\nRestock soon to avoid missing sales!",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"product_name": "string", "quantity_remaining": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Low Stock Alert - Email
		{
			Name:      "low_stock_alert_email",
			EventType: string(domain.EventLowStock),
			Channel:   string(domain.ChannelEmail),
			Subject:   "⚠️ Low Stock Alert - {{product_name}}",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#ffc107;padding:20px;text-align:center}.content{padding:20px}.alert{background:#fff3cd;border:1px solid #ffeeba;padding:15px;border-radius:4px}</style></head>
<body>
<div class="header"><h1>Low Stock Alert ⚠️</h1></div>
<div class="content">
<div class="alert">
<p><strong>Product:</strong> {{product_name}}</p>
<p><strong>Remaining:</strong> {{quantity_remaining}} units</p>
</div>
<p>Restock soon to avoid missing sales!</p>
</div>
</body>
</html>`,
			Variables: domain.Map{"product_name": "string", "quantity_remaining": "string"},
			IsActive:  true,
			Priority:  2,
		},

		// Payout Ready - WhatsApp
		{
			Name:               "payout_ready_whatsapp",
			EventType:          string(domain.EventPayoutReady),
			Channel:            string(domain.ChannelWhatsApp),
			Subject:            "",
			Body:               "💰 Payout Ready!\n\nAmount: {{amount}}\n\nWithdraw now: {{payout_url}}",
			WhatsAppTemplateID: "",
			Variables:          domain.Map{"amount": "string", "payout_url": "string"},
			IsActive:           true,
			Priority:           1,
		},
		// Payout Ready - Email
		{
			Name:      "payout_ready_email",
			EventType: string(domain.EventPayoutReady),
			Channel:   string(domain.ChannelEmail),
			Subject:   "💰 Your Payout is Ready - {{amount}}",
			Body: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px}.header{background:#28a745;color:white;padding:20px;text-align:center}.content{padding:20px;text-align:center}.amount{font-size:36px;font-weight:bold;color:#28a745;margin:20px 0}.btn{background:#28a745;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block}</style></head>
<body>
<div class="header"><h1>Payout Ready! 💰</h1></div>
<div class="content">
<p>Great news! Your payout is ready for withdrawal.</p>
<div class="amount">{{amount}}</div>
<p><a href="{{payout_url}}" class="btn">Withdraw Now</a></p>
</div>
</body>
</html>`,
			Variables: domain.Map{"amount": "string", "payout_url": "string"},
			IsActive:  true,
			Priority:  2,
		},
	}

	for _, template := range templates {
		var existing domain.NotificationTemplate
		result := db.Where("name = ?", template.Name).First(&existing)

		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				// Create new template
				if err := db.Create(&template).Error; err != nil {
					logger.Error(fmt.Sprintf("Failed to create notification template %s: %v", template.Name, err))
				} else {
					logger.Info(fmt.Sprintf("Created notification template: %s", template.Name))
				}
			} else {
				logger.Error(fmt.Sprintf("Error checking notification template %s: %v", template.Name, result.Error))
			}
		} else {
			// Update existing template
			existing.Body = template.Body
			existing.Subject = template.Subject
			existing.Variables = template.Variables
			existing.IsActive = template.IsActive
			existing.Priority = template.Priority
			if err := db.Save(&existing).Error; err != nil {
				logger.Error(fmt.Sprintf("Failed to update notification template %s: %v", template.Name, err))
			} else {
				logger.Info(fmt.Sprintf("Updated notification template: %s", template.Name))
			}
		}
	}

	logger.Info("Notification template seeding completed")
	return nil
}
