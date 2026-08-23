package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"insta-api/internal/core/domain"
	"insta-api/internal/logger"
)

// NotificationJob represents a notification to be processed
type NotificationJob struct {
	ID        string
	Params    NotificationParams
	Priority  int // 1 = high (OTPs), 2 = normal (orders), 3 = low (marketing)
	CreatedAt time.Time
	Retries   int
	MaxRetries int
}

// NotificationQueueService handles async notification processing
// This is a simple in-memory implementation that can be replaced with Redis/Asynq later
type NotificationQueueService struct {
	notificationService *TransactionalNotificationService
	highPriorityQueue   chan *NotificationJob
	normalQueue         chan *NotificationJob
	lowPriorityQueue    chan *NotificationJob
	workers             int
	wg                  sync.WaitGroup
	shutdown            chan struct{}
	running             bool
	mu                  sync.Mutex
}

// Priority levels
const (
	PriorityHigh   = 1 // OTPs, security alerts
	PriorityNormal = 2 // Order notifications
	PriorityLow    = 3 // Marketing, reminders
)

// NewNotificationQueueService creates a new queue service
func NewNotificationQueueService(notificationService *TransactionalNotificationService) *NotificationQueueService {
	return &NotificationQueueService{
		notificationService: notificationService,
		highPriorityQueue:   make(chan *NotificationJob, 100),
		normalQueue:         make(chan *NotificationJob, 500),
		lowPriorityQueue:    make(chan *NotificationJob, 200),
		workers:             5, // Number of concurrent workers
		shutdown:            make(chan struct{}),
	}
}

// Start begins processing notifications
func (q *NotificationQueueService) Start() {
	q.mu.Lock()
	if q.running {
		q.mu.Unlock()
		return
	}
	q.running = true
	q.mu.Unlock()

	logger.Info(fmt.Sprintf("Starting notification queue service with %d workers", q.workers))

	// Start worker goroutines
	for i := 0; i < q.workers; i++ {
		q.wg.Add(1)
		go q.worker(i)
	}
}

// Stop gracefully shuts down the queue
func (q *NotificationQueueService) Stop() {
	q.mu.Lock()
	if !q.running {
		q.mu.Unlock()
		return
	}
	q.running = false
	q.mu.Unlock()

	logger.Info("Shutting down notification queue service...")
	close(q.shutdown)
	q.wg.Wait()
	logger.Info("Notification queue service stopped")
}

// worker processes jobs from the queues
func (q *NotificationQueueService) worker(id int) {
	defer q.wg.Done()
	logger.Info(fmt.Sprintf("Notification worker %d started", id))

	for {
		select {
		case <-q.shutdown:
			logger.Info(fmt.Sprintf("Notification worker %d shutting down", id))
			return
		case job := <-q.highPriorityQueue:
			q.processJob(job)
		case job := <-q.normalQueue:
			q.processJob(job)
		case job := <-q.lowPriorityQueue:
			q.processJob(job)
		default:
			// No jobs, wait a bit before checking again
			time.Sleep(100 * time.Millisecond)
		}
	}
}

// processJob handles a single notification job
func (q *NotificationQueueService) processJob(job *NotificationJob) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	err := q.notificationService.SendWithFallback(ctx, job.Params)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to process notification job %s: %v", job.ID, err))

		// Retry logic
		if job.Retries < job.MaxRetries {
			job.Retries++
			logger.Info(fmt.Sprintf("Retrying notification job %s (attempt %d/%d)", job.ID, job.Retries, job.MaxRetries))

			// Exponential backoff
			backoff := time.Duration(job.Retries*job.Retries) * time.Second
			time.Sleep(backoff)

			q.enqueue(job)
		} else {
			logger.Error(fmt.Sprintf("Notification job %s failed after %d attempts", job.ID, job.MaxRetries))
		}
	} else {
		logger.Info(fmt.Sprintf("Successfully processed notification job %s", job.ID))
	}
}

// enqueue adds a job to the appropriate queue based on priority
func (q *NotificationQueueService) enqueue(job *NotificationJob) {
	switch job.Priority {
	case PriorityHigh:
		select {
		case q.highPriorityQueue <- job:
		default:
			logger.Error(fmt.Sprintf("High priority queue full, dropping job %s", job.ID))
		}
	case PriorityNormal:
		select {
		case q.normalQueue <- job:
		default:
			logger.Error(fmt.Sprintf("Normal queue full, dropping job %s", job.ID))
		}
	case PriorityLow:
		select {
		case q.lowPriorityQueue <- job:
		default:
			logger.Error(fmt.Sprintf("Low priority queue full, dropping job %s", job.ID))
		}
	}
}

// QueueNotification adds a notification to be processed asynchronously
func (q *NotificationQueueService) QueueNotification(params NotificationParams) {
	q.QueueNotificationWithPriority(params, PriorityNormal)
}

// QueueNotificationWithPriority adds a notification with specific priority
func (q *NotificationQueueService) QueueNotificationWithPriority(params NotificationParams, priority int) {
	job := &NotificationJob{
		ID:         generateJobID(params),
		Params:     params,
		Priority:   priority,
		CreatedAt:  time.Now(),
		MaxRetries: 3,
	}

	q.enqueue(job)
	logger.Info(fmt.Sprintf("Queued notification job %s with priority %d", job.ID, priority))
}

// generateJobID creates a unique ID for the job
func generateJobID(params NotificationParams) string {
	return params.UserID + "_" + string(params.EventType) + "_" + time.Now().Format("20060102150405")
}

// ============================================
// Convenience methods for common notifications
// ============================================

// QueueOrderConfirmation queues order confirmation for async processing
func (q *NotificationQueueService) QueueOrderConfirmation(orderID, buyerID, buyerPhone, buyerEmail, storeName, amount, trackingURL string) {
	q.QueueNotificationWithPriority(NotificationParams{
		UserID:        buyerID,
		EventType:     "ORDER_PLACED",
		ReferenceID:   orderID,
		ReferenceType: "order",
		Phone:         buyerPhone,
		Email:         buyerEmail,
		Variables: map[string]string{
			"order_id":     orderID,
			"store_name":   storeName,
			"amount":       amount,
			"tracking_url": trackingURL,
		},
	}, PriorityNormal)
}

// QueueNewOrderSellerAlert queues new order alert for seller
func (q *NotificationQueueService) QueueNewOrderSellerAlert(orderID, sellerID, sellerPhone, sellerEmail, buyerName, itemCount, amount, orderURL string) {
	q.QueueNotificationWithPriority(NotificationParams{
		UserID:        sellerID,
		EventType:     "NEW_ORDER_SELLER",
		ReferenceID:   orderID,
		ReferenceType: "order",
		Phone:         sellerPhone,
		Email:         sellerEmail,
		Variables: map[string]string{
			"buyer_name": buyerName,
			"item_count": itemCount,
			"amount":     amount,
			"order_url":  orderURL,
		},
	}, PriorityNormal)
}

// QueueOTP queues an OTP notification with high priority
func (q *NotificationQueueService) QueueOTP(userID, phone, email, otpCode string, eventType domain.NotificationEventType) {
	q.QueueNotificationWithPriority(NotificationParams{
		UserID:        userID,
		EventType:     eventType,
		ReferenceID:   "",
		ReferenceType: "auth",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"otp_code": otpCode,
		},
	}, PriorityHigh) // OTPs are high priority
}

// QueueSellerLoginAlert queues a login alert for sellers
func (q *NotificationQueueService) QueueSellerLoginAlert(sellerID, phone, email, deviceInfo, loginTime, location string) {
	q.QueueNotificationWithPriority(NotificationParams{
		UserID:        sellerID,
		EventType:     "SELLER_LOGIN_ALERT",
		ReferenceID:   "",
		ReferenceType: "security",
		Phone:         phone,
		Email:         email,
		Variables: map[string]string{
			"device_info": deviceInfo,
			"time":        loginTime,
			"location":    location,
		},
	}, PriorityHigh) // Security alerts are high priority
}

// GetQueueStats returns current queue statistics
func (q *NotificationQueueService) GetQueueStats() map[string]int {
	return map[string]int{
		"high_priority": len(q.highPriorityQueue),
		"normal":        len(q.normalQueue),
		"low_priority":  len(q.lowPriorityQueue),
	}
}
