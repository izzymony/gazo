# Transactional Notification System

## Overview

The vibaar transactional notification system provides multi-channel notifications (WhatsApp, Email, SMS) with automatic fallback logic for cost optimization.

**Channel Priority:** WhatsApp → Email → SMS

**Cost Optimization:**
- WhatsApp Utility: ~$0.01 per message
- WhatsApp Authentication: ~$0.004 per message
- Email: ~$0.0001 per message
- SMS: ~$0.03 per message (Nigeria)

**Estimated Monthly Savings:** 60-75% vs SMS-first approach

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT TRIGGER                            │
│   (Order created, status changed, payment confirmed)        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         TRANSACTIONAL NOTIFICATION SERVICE                  │
│   • Load template by event type + channel                   │
│   • Check user notification preferences                     │
│   • Execute fallback chain with timeouts                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  CHANNEL FALLBACK CHAIN                     │
│                                                             │
│   1. TRY WHATSAPP (5s timeout)                              │
│      ├─ Success: Log & complete                             │
│      └─ Fail/Timeout: Continue to step 2                    │
│                                                             │
│   2. TRY EMAIL (30s timeout)                                │
│      ├─ Success: Log & complete                             │
│      └─ Fail/Timeout: Continue to step 3                    │
│                                                             │
│   3. TRY SMS (10s timeout) - Last Resort                    │
│      ├─ Success: Log & complete                             │
│      └─ Fail: Mark as failed                                │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              NOTIFICATION LOG                               │
│   • Track all attempts with status                          │
│   • Track which channel succeeded                           │
│   • Monitor costs per channel                               │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

### Domain Models
| File | Purpose |
|------|---------|
| `internal/core/domain/notification_template.go` | Template model, channel/event constants |
| `internal/core/domain/notification_log.go` | Delivery tracking, cost tracking |
| `internal/core/domain/user_notification_preferences.go` | User opt-in/opt-out preferences |

### Repositories
| File | Purpose |
|------|---------|
| `internal/adapter/repositories/sql/notificationTemplateRepository.go` | Template CRUD |
| `internal/adapter/repositories/sql/notificationLogRepository.go` | Log CRUD, analytics |
| `internal/adapter/repositories/sql/userNotificationPreferencesRepository.go` | User preferences |

### Interfaces
| File | Purpose |
|------|---------|
| `internal/ports/notificationTemplateInterface.go` | All notification interfaces |

### Services
| File | Purpose |
|------|---------|
| `internal/core/services/transactionalNotificationService.go` | Core service with fallback logic |
| `internal/core/services/notificationQueueService.go` | Async queue processing |

### Webhook Handlers
| File | Purpose |
|------|---------|
| `internal/adapter/api/controller/whatsappWebhookHandler.go` | WhatsApp/Twilio status updates |
| `internal/adapter/api/routes/whatsappWebhook.go` | Webhook routes |

### Seeder
| File | Purpose |
|------|---------|
| `internal/seeder/notification_template_seeder.go` | Default templates |

---

## Supported Events

### Order Lifecycle (Buyer)
| Event | Constant | Channels |
|-------|----------|----------|
| Order Placed | `ORDER_PLACED` | WhatsApp, Email, SMS |
| Order Shipped | `ORDER_SHIPPED` | WhatsApp, Email, SMS |
| Order Delivered | `ORDER_DELIVERED` | WhatsApp, Email, SMS |

### Seller Notifications
| Event | Constant | Channels |
|-------|----------|----------|
| New Order | `NEW_ORDER_SELLER` | WhatsApp, Email, SMS |
| Low Stock | `LOW_STOCK` | WhatsApp, Email |
| Payout Ready | `PAYOUT_READY` | WhatsApp, Email |

### Security & OTP
| Event | Constant | Channels |
|-------|----------|----------|
| Password Reset OTP | `PASSWORD_RESET_OTP` | WhatsApp, Email, SMS |
| Withdrawal OTP | `WITHDRAWAL_OTP` | WhatsApp, Email, SMS |
| Seller Login Alert | `SELLER_LOGIN_ALERT` | WhatsApp, Email, SMS |

---

## Configuration

### Environment Variables

```bash
# Feature Flag (REQUIRED)
TRANSACTIONAL_NOTIFICATIONS_ENABLED=true

# Twilio (WhatsApp + SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_PHONE_NUMBER=+14155238886
MESSAGING_SERVICE_SID=your_messaging_service_sid

# SendGrid (Email)
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@vibaar.com
SENDGRID_FROM_NAME=Vibaar

# WhatsApp Webhook Verification
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<generate a random secret; required outside local>
```

---

## Usage Examples

### Sending Order Confirmation

```go
// In OrderService
func (o *OrderService) sendOrderPlacedNotifications(order *domain.Order, item domain.OrderItem, buyer *domain.User) {
    if o.transactionalNotificationService == nil || !o.transactionalNotificationService.IsEnabled() {
        return
    }

    ctx := context.Background()

    // Send to buyer
    go func() {
        err := o.transactionalNotificationService.SendOrderConfirmation(
            ctx,
            order.ID,
            order.UserID,
            buyer.Phone,
            buyer.Email,
            business.Name,
            amount,
            trackingURL,
        )
        if err != nil {
            logger.Error(fmt.Sprintf("Failed to send order confirmation: %v", err))
        }
    }()
}
```

### Sending OTP

```go
// Send Password Reset OTP
err := transactionalNotificationService.SendPasswordResetOTP(
    ctx,
    userID,
    phone,
    email,
    otpCode,
)

// Send Withdrawal OTP
err := transactionalNotificationService.SendWithdrawalOTP(
    ctx,
    userID,
    phone,
    email,
    otpCode,
    amount,
)
```

### Using the Queue Service (Async)

```go
queueService := services.NewNotificationQueueService(transactionalService)
queueService.Start() // Start workers

// Queue with normal priority
queueService.QueueOrderConfirmation(orderID, buyerID, phone, email, storeName, amount, trackingURL)

// Queue with high priority (OTPs)
queueService.QueueOTP(userID, phone, email, otpCode, domain.EventPasswordResetOTP)

// Stop gracefully on shutdown
queueService.Stop()
```

---

## Webhook Endpoints

### WhatsApp (Meta Cloud API)
```
GET  /api/v1/webhooks/whatsapp  - Verification challenge
POST /api/v1/webhooks/whatsapp  - Status updates
```

### Twilio Status Callback
```
POST /api/v1/webhooks/twilio/status  - Delivery status updates
```

---

## Database Tables

### notification_templates
```sql
CREATE TABLE notification_templates (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name VARCHAR(100) UNIQUE,
    event_type VARCHAR(50),
    channel VARCHAR(20),
    subject VARCHAR(255),
    body TEXT,
    whats_app_template_id VARCHAR(100),
    variables JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    priority BIGINT DEFAULT 1
);
```

### notification_logs
```sql
CREATE TABLE notification_logs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    user_id VARCHAR(100),
    event_type VARCHAR(50),
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(100),
    channels_attempted JSONB,
    channel_delivered VARCHAR(20),
    status VARCHAR(20),
    attempt_count INT DEFAULT 0,
    whats_app_message_id VARCHAR(100),
    whats_app_status VARCHAR(20),
    estimated_cost DECIMAL(10,4),
    last_error TEXT,
    failed_channels JSONB,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP
);
```

### user_notification_preferences
```sql
CREATE TABLE user_notification_preferences (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    user_id VARCHAR(100) UNIQUE,
    whats_app_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    order_updates BOOLEAN DEFAULT TRUE,
    seller_alerts BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    promotional_messages BOOLEAN DEFAULT FALSE
);
```

---

## Analytics Queries

### Cost Summary by Channel
```sql
SELECT
    channel_delivered,
    COUNT(*) as count,
    SUM(estimated_cost) as total_cost
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY channel_delivered;
```

### Delivery Success Rate
```sql
SELECT
    event_type,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) as successful,
    ROUND(100.0 * SUM(CASE WHEN status = 'sent' OR status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type;
```

### Failed Notifications
```sql
SELECT
    event_type,
    channel_delivered,
    last_error,
    COUNT(*) as count
FROM notification_logs
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, channel_delivered, last_error
ORDER BY count DESC;
```

---

## Seeding Templates

Templates are automatically seeded when the application starts (via `seeder.SeedData()`).

### Manual Seeding (Production)
```sql
-- See notification_templates table in production:
SELECT name, event_type, channel FROM notification_templates ORDER BY event_type, priority;
```

### Adding New Templates
1. Add the template to `internal/seeder/notification_template_seeder.go`
2. Add the event type constant to `internal/core/domain/notification_template.go`
3. Deploy and run seeder

---

## Troubleshooting

### Notifications Not Sending
1. Check `TRANSACTIONAL_NOTIFICATIONS_ENABLED=true` is set
2. Check Twilio/SendGrid credentials are configured
3. Check notification_logs table for errors
4. Verify templates exist for the event type

### WhatsApp Failing
1. Verify phone number format includes country code (e.g., +2347012345678)
2. Check Twilio WhatsApp sandbox is configured (for testing)
3. Review Twilio console for error messages

### Email Failing
1. Verify SendGrid API key is valid
2. Check sender email is verified in SendGrid
3. Review SendGrid activity for bounces/blocks

---

## Notes

- **Registration OTP:** Disabled by design
- **Seller Login Alert:** Notification only, not OTP
- **Security alerts cannot be disabled** by users (always enabled)
- **Promotional messages are opt-in only** (default: false)
