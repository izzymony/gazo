package ports

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"time"
)

type OrderRepoInterface interface {
	Create(data *domain.Order, isGuest bool) (*domain.Order, error)
	Find(id string, isGuest bool) (*domain.Order, error)
	GetAll(param map[string]interface{}, isGuest bool) ([]domain.Order, error)
	UpdateOrder(id string, input domain.Order, isGuest bool) (*domain.Order, error)
	// ClaimPaymentReceived atomically flips payment_received false->true in one
	// conditional UPDATE; returns true only for the caller that won the claim.
	// Used as the idempotency gate against double-processing a payment (E0.3).
	ClaimPaymentReceived(id string, isGuest bool) (bool, error)
	UpdateOrderItem(id string, input domain.OrderItem, isGuest bool) (*domain.OrderItem, error)
	UpdateOrderItemStatus(id string, status string, statusUpdatedAt time.Time, isGuest bool) (*domain.OrderItem, error)
	// ClaimOrderItemDelivered atomically flips an item's status to "delivered" in
	// one conditional UPDATE (only if not already delivered); returns true for the
	// caller that won. Idempotency gate so a double "mark delivered" tap on a
	// Self-delivery order can never move funds to the clearing balance twice.
	ClaimOrderItemDelivered(id string, isGuest bool) (bool, error)
	Delete(id string) (domain.Order, error)
	GetOneOrder(param map[string]interface{}, isGuest bool) (*domain.Order, error)
	GetOneOrderItem(param map[string]interface{}, isGuest bool) (*domain.OrderItem, error)
	GetAllOrdersPaginated(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.Order, int64, error)
	GetAllOrders(params map[string]interface{}, isGuest bool) ([]domain.Order, error)
	GetAllOrderItemsPaginated(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.OrderItem, int64, error)
	GetAllOrderItems(params map[string]interface{}, isGuest bool) ([]domain.OrderItem, error)
	DeleteOrder(id string, isGuest bool) error
	AppendActivity(id string, newActivity domain.OrderActivity, activityType string, isGuest bool) (*domain.OrderItem, error)
}
