package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"vibaar/backend/internal/adapter/api/requests"
	mysql_repo "vibaar/backend/internal/adapter/repositories/sql"
	"vibaar/backend/internal/core/domain"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"
	"vibaar/backend/internal/ports"

	"gorm.io/gorm"
)

type OrderService struct {
	orderRepo                        ports.OrderRepoInterface
	userRepo                         ports.UserRepoInterface
	shippingRepo                     ports.ShippingInterface
	businessRepo                     ports.BusinessIface
	product                          *ProductService
	notificationService              *NotificationService
	transactionalNotificationService *TransactionalNotificationService
	dispatcher                       *NotificationDispatcher
	// shipping  *ShippingService
}

func NewOrderService(db *gorm.DB) *OrderService {
	return &OrderService{
		orderRepo:                        mysql_repo.NewOrderRepository(db),
		userRepo:                         mysql_repo.NewUserRepository(db),
		shippingRepo:                     mysql_repo.NewShippingRepository(db),
		businessRepo:                     mysql_repo.NewBusinessRepository(db),
		product:                          NewProductService(db),
		notificationService:              NewNotificationService(db),
		transactionalNotificationService: NewTransactionalNotificationService(db),
		dispatcher:                       NewNotificationDispatcher(db),
		// shipping:  NewShippingService(db),
	}
}

// ValidateOrder builds + validates the order WITHOUT persisting it. Reused by
// order-on-success (InitiateCheckout pre-check) and by Create at Verify.
func (o *OrderService) ValidateOrder(input requests.Order, userId string, isGuest bool) (*domain.Order, error) {
	user, err := o.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}

	// Keep a caller-supplied invoice stable: order-on-success generates it at
	// InitiateCheckout and reuses it here at Verify, so the payment reference and
	// the created order share one invoice.
	if input.Invoice == "" {
		input.Invoice = helper.GenerateInvoiceReference()
	}
	order := domain.Order{}

	var shippingPrice float64

	for _, item := range input.Items {
		orderItem := domain.OrderItem{
			ProductID:        item.ProductID,
			Price:            item.Price,
			Quantity:         item.Quantity,
			ShippingOptionID: item.ShippingOptionID,
		}

		// Add variant tracking if present (critical for fulfillment)
		if item.VariantSelection != "" {
			orderItem.VariantSelection = item.VariantSelection
			if item.VariantData != nil {
				// Convert map[string]interface{} to MapArray ([]map[string]interface{})
				orderItem.VariantData = domain.MapArray{item.VariantData}
			}
		}

		order.Items = append(order.Items, orderItem)
		shippingOption, err := o.shippingRepo.GetOneShippingRate(map[string]interface{}{"id": item.ShippingOptionID}, isGuest)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong")
		}
		if shippingOption == nil {
			return nil, fmt.Errorf("shipping option not found")
		}
		price, err := shippingOption.ParsePrice()
		if err != nil {
			return nil, fmt.Errorf("something went wrong")
		}
		shippingPrice += price
	}

	var totalPrice float64

	for i, item := range order.Items {
		product, err := o.product.Find(item.ProductID)
		if err != nil {
			return nil, fmt.Errorf("%v %v", item.ProductID, err)
		}

		if product.Price != item.Price {
			return nil, fmt.Errorf("mis-match price for %v", product.Title)
		}
		order.Items[i].BusinessID = product.BusinessID
		totalPrice += product.Price * float64(item.Quantity)
	}

	if totalPrice != input.SubTotal {
		return nil, fmt.Errorf("mis-match sub total price")
	}

	if totalPrice+shippingPrice != input.Total {
		return nil, fmt.Errorf("mis-match total price")
	}

	helper.Copy(input, &order)
	order.UserID = userId

	return &order, nil
}

// Create validates the order against live product state, persists it, and fires
// the order-placed activities/notifications. The legacy order-first path calls
// it at checkout.
func (o *OrderService) Create(input requests.Order, userId string, isGuest bool) (*domain.Order, error) {
	order, err := o.ValidateOrder(input, userId, isGuest)
	if err != nil {
		return nil, err
	}
	return o.persistValidatedOrder(order, userId, isGuest)
}

// CreateFromValidated persists an ALREADY-validated order without re-checking
// live product prices/existence. The order-on-success path uses it at Verify:
// the order was validated and the buyer charged at InitiateCheckout, so
// re-validating post-payment could reject a paid order (charged-but-no-order)
// if a product's price changed or the product was removed during the payment
// window. The order carries the locked prices, quantities, and resolved
// business IDs captured at initiate-time validation.
func (o *OrderService) CreateFromValidated(order *domain.Order, isGuest bool) (*domain.Order, error) {
	return o.persistValidatedOrder(order, order.UserID, isGuest)
}

// persistValidatedOrder writes a validated order + its order-placed side-effects
// (activities, notifications). Shared by Create (legacy) and CreateFromValidated
// (order-on-success) so both produce identical order records + notifications.
func (o *OrderService) persistValidatedOrder(order *domain.Order, userId string, isGuest bool) (*domain.Order, error) {
	// user is needed only for the post-create notifications below
	user, err := o.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	createdOrder, err := o.orderRepo.Create(order, isGuest)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}

	for _, item := range createdOrder.Items {
		_, err = o.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityOrderPlaced),
			Subtitle: string(helper.OrderActivityOrderPlaced),
			Details:  "you placed a new order.",
			Time:     time.Now().String(),
		}, "buyer", isGuest)

		_, err = o.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityNewOrderReceived),
			Subtitle: string(helper.OrderActivityNewOrderReceived),
			Details: func() string {
				if user != nil {
					username := user.UserName
					if username == "" {
						username = user.InstagramUsername
					}
					return fmt.Sprintf("@%s placed order.", username)
				} else {
					return "user placed order."
				}
			}(),
			Time: time.Now().String(),
		}, "seller", isGuest)

		// Send transactional notifications (WhatsApp -> Email -> SMS)
		o.sendOrderPlacedNotifications(createdOrder, item, user)
	}

	// NS2 buyer.order.placed is order-level (one per checkout), not per item —
	// the in-app record is emitted once here via the dispatcher. Kept distinct
	// from payment.confirmed (emitted in transactionService.Verify).
	_ = o.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "buyer.order.placed",
		UserID: userId,
		Vars:   map[string]string{"count": strconv.Itoa(len(createdOrder.Items))},
	})

	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}

	return order, nil
}

// sendOrderPlacedNotifications sends transactional notifications for new orders
func (o *OrderService) sendOrderPlacedNotifications(order *domain.Order, item domain.OrderItem, buyer *domain.User) {
	if o.transactionalNotificationService == nil || !o.transactionalNotificationService.IsEnabled() {
		return
	}

	ctx := context.Background()

	// Get buyer contact info
	buyerPhone := ""
	buyerEmail := ""
	buyerName := "Customer"
	if buyer != nil {
		buyerPhone = buyer.Phone
		buyerEmail = buyer.Email
		if buyer.Firstname != "" {
			buyerName = buyer.Firstname
		} else if buyer.UserName != "" {
			buyerName = buyer.UserName
		}
	}

	// Get seller/business info
	business, err := o.businessRepo.Find(item.BusinessID)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to get business for transactional notification: %v", err))
		return
	}

	// Get seller user info
	seller, err := o.userRepo.GetOne(map[string]interface{}{"id": business.UserID}, false)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to get seller for transactional notification: %v", err))
	}

	sellerPhone := ""
	sellerEmail := ""
	if seller != nil {
		sellerPhone = seller.Phone
		sellerEmail = seller.Email
	}
	if business.Phone != "" {
		sellerPhone = business.Phone
	}
	if business.Email != "" {
		sellerEmail = business.Email
	}

	// Calculate order amount
	amount := fmt.Sprintf("₦%.2f", order.Total)
	trackingURL := fmt.Sprintf("https://myinstashop.com/orders/%s", item.ID)
	orderURL := fmt.Sprintf("https://myinstashop.com/seller/orders/%s", item.ID)

	// Send order confirmation to buyer (async, don't block order creation)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error(fmt.Sprintf("recovered panic in SendOrderConfirmation goroutine: %v", r))
			}
		}()
		if buyerPhone != "" || buyerEmail != "" {
			err := o.transactionalNotificationService.SendOrderConfirmation(
				ctx,
				order.ID,
				order.UserID,
				buyerPhone,
				buyerEmail,
				business.Name,
				amount,
				trackingURL,
			)
			if err != nil {
				logger.Error(fmt.Sprintf("Failed to send order confirmation to buyer: %v", err))
			}
		}
	}()

	// Send new order alert to seller (async)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error(fmt.Sprintf("recovered panic in SendNewOrderToSeller goroutine: %v", r))
			}
		}()
		if sellerPhone != "" || sellerEmail != "" {
			itemCount := strconv.Itoa(len(order.Items))
			err := o.transactionalNotificationService.SendNewOrderToSeller(
				ctx,
				order.ID,
				business.UserID,
				sellerPhone,
				sellerEmail,
				buyerName,
				itemCount,
				amount,
				orderURL,
			)
			if err != nil {
				logger.Error(fmt.Sprintf("Failed to send new order alert to seller: %v", err))
			}
		}
	}()
}

func (o *OrderService) UpdateOrder(id string, input requests.Order, userId string, isGuest bool) (interface{}, error) {
	existingOrder, err := o.orderRepo.GetOneOrder(map[string]interface{}{"id": id}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if existingOrder == nil {
		return nil, fmt.Errorf("invalid order")
	}

	if existingOrder.UserID != userId {
		return nil, fmt.Errorf("userId mismatch")
	}
	helper.Copy(input, &existingOrder)

	updatedOrder, err := o.orderRepo.UpdateOrder(id, *existingOrder, isGuest)
	if err != nil {
		return nil, fmt.Errorf("failed to update order")
	}

	return updatedOrder, nil
}

func (o *OrderService) GetAllOrders(userId string, isGuest bool, page, limit int) ([]domain.Order, int64, error) {
	profiles, total, err := o.orderRepo.GetAllOrdersPaginated(map[string]interface{}{"user_id": userId}, isGuest, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	return profiles, total, nil
}

func (o *OrderService) FetchOne(param map[string]interface{}) (*domain.Order, error) {
	return o.orderRepo.GetOneOrder(param, false)
}

func (o *OrderService) GetOrder(id, userId string, isGuest bool) (*domain.Order, error) {
	order, err := o.orderRepo.Find(id, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if order.UserID != userId {
		return nil, fmt.Errorf("userId mismatch")
	}

	return order, nil
}

func (o *OrderService) FindOrderItem(id, userId string, isGuest bool) (*domain.OrderItem, error) {
	item, err := o.orderRepo.GetOneOrderItem(map[string]interface{}{"id": id}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if item == nil {
		return nil, fmt.Errorf("invalid order Item")
	}
	// Load the FULL parent order (GetOneOrder preloads Items + Product; the plain
	// Find does not) and attach it, so the order-details screen can render the
	// line items + real total. Without this the item's .Order stays empty and the
	// screen shows "No items to display" and falls back to the item unit price.
	order, err := o.orderRepo.GetOneOrder(map[string]interface{}{"id": item.OrderID}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if order == nil {
		return nil, fmt.Errorf("order not found")
	}
	if order.UserID != userId {
		return nil, fmt.Errorf("userId mismatch")
	}
	item.SellerActivity = nil
	item.Order = *order

	return item, nil
}

// FindOrderByInvoice - Public method to find order by invoice (for payment success page)
func (o *OrderService) FindOrderByInvoice(invoice string) (*domain.OrderItem, error) {
	var order *domain.Order
	var item *domain.OrderItem
	var err error
	var isGuest bool

	// First try to find the order in guest tables (for guest-to-account conversion flow)
	order, err = o.orderRepo.GetOneOrder(map[string]interface{}{"invoice": invoice}, true)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong checking guest orders")
	}

	if order != nil {
		// Found in guest orders, now get the order item from guest tables
		item, err = o.orderRepo.GetOneOrderItem(map[string]interface{}{"order_id": order.ID}, true)
		isGuest = true
	} else {
		// Not found in guest orders, try regular orders
		order, err = o.orderRepo.GetOneOrder(map[string]interface{}{"invoice": invoice}, false)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong checking regular orders")
		}

		if order != nil {
			// Found in regular orders, get the order item from regular tables
			item, err = o.orderRepo.GetOneOrderItem(map[string]interface{}{"order_id": order.ID}, false)
			isGuest = false
		}
	}

	if order == nil {
		return nil, fmt.Errorf("order not found")
	}

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong fetching order item")
	}
	if item == nil {
		return nil, fmt.Errorf("order item not found")
	}

	// Fetch the order again to get the most up-to-date data (in case it was updated by payment processing)
	freshOrder, err := o.orderRepo.GetOneOrder(map[string]interface{}{"id": order.ID}, isGuest)
	if err == nil && freshOrder != nil {
		order = freshOrder
	}

	// Populate the order information in the item
	item.Order = *order

	// If there's a shipping profile, fetch the shipping address details
	if order.ShippingProfileID != "" {
		shippingProfile, err := o.shippingRepo.FindShippingProfile(order.ShippingProfileID, isGuest)
		if err == nil && shippingProfile != nil {
			// Create a basic address string from the shipping profile
			addressParts := []string{}
			if shippingProfile.Street != "" {
				addressParts = append(addressParts, shippingProfile.Street)
			}
			if shippingProfile.Town != "" {
				addressParts = append(addressParts, shippingProfile.Town)
			}
			if shippingProfile.State != "" {
				addressParts = append(addressParts, shippingProfile.State)
			}
			// Store the address in a field that the frontend can access
			if len(addressParts) > 0 {
				item.Order.ShippingProfileID = strings.Join(addressParts, ", ")
			}
		}
	}

	item.SellerActivity = nil
	return item, nil
}

func (o *OrderService) GetUserOrders(userId string, isGuest bool, page, limit int) ([]domain.OrderItem, int64, error) {
	items, totalItems, err := o.orderRepo.GetAllOrderItemsPaginated(
		map[string]interface{}{"user_id": userId}, isGuest, page, limit,
	)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong fetching order items")
	}

	for i := range items {
		items[i].SellerActivity = nil
	}

	return items, totalItems, nil
}

func (o *OrderService) DeleteOrder(id string, userId string, isGuest bool) error {
	existingOrder, err := o.orderRepo.GetOneOrder(map[string]interface{}{"id": id}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if existingOrder == nil {
		return fmt.Errorf("invalid profile")
	}

	if existingOrder.UserID != userId {
		return fmt.Errorf("userId mismatch")
	}
	err = o.orderRepo.DeleteOrder(id, isGuest)
	if err != nil {
		return fmt.Errorf("failed to delete shipping profile")
	}
	return nil
}
