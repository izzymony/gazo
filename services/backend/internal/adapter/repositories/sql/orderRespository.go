package mysql_repo

import (
	"insta-api/internal/core/domain"
	"insta-api/internal/helper"
	"insta-api/internal/ports"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) ports.OrderRepoInterface {
	return &OrderRepository{
		db: db,
	}
}

func (repo *OrderRepository) GetAllOrdersPaginated(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.Order, int64, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	var orders []domain.Order
	var total int64

	query := repo.db.Table(tableName).Preload("User").Preload("Items").Preload("Items.Product").Preload("Items.ShippingOption").Preload("Items.Shipment")
	for field, value := range params {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}
	if err := query.Model(&domain.Order{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Order("updated_at desc").Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (repo *OrderRepository) GetAllOrders(params map[string]interface{}, isGuest bool) ([]domain.Order, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	var orders []domain.Order

	query := repo.db.Table(tableName).Preload("User").Preload("Items").Preload("Items.Product").Preload("Items.ShippingOption").Preload("Items.Shipment")
	for field, value := range params {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.Order("updated_at desc").Find(&orders).Error; err != nil {
		return nil, err
	}

	return orders, nil
}

func (repo *OrderRepository) GetAllOrderItemsPaginated(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.OrderItem, int64, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}

	var orderItems []domain.OrderItem
	var total int64

	query := repo.db.Table(tableName).
		Joins("JOIN orders ON orders.id = order_items.order_id")

	for field, value := range params {
		if helper.NotEmpty(value) {
			if field == "user_id" {
				query = query.Where("orders.user_id = ?", value)
			} else if field == "business_id" {
				query = query.Where("order_items.business_id = ?", value)
			} else {
				query = query.Where(field+" = ?", value)
			}
		}
	}

	if err := query.Model(&domain.OrderItem{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).
		Order("order_items.created_at desc").
		Preload("Order", func(db *gorm.DB) *gorm.DB {
			return db.Preload("ShippingProfile.ShippingUser").
				Select("id, invoice, payment_received, created_at, payment_method, shipping_profile_id, user_id")
		}).
		Preload("Order.User").
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, price, image, business_id")
		}).
		Preload("Business").
		Preload("Shipment").
		Preload("ShippingOption").
		Find(&orderItems).Error; err != nil {
		return nil, 0, err
	}

	return orderItems, total, nil
}

func (repo *OrderRepository) GetAllOrderItems(params map[string]interface{}, isGuest bool) ([]domain.OrderItem, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}

	var orders []domain.OrderItem
	var total int64

	query := repo.db.Table(tableName).Preload("Order", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, invoice, payment_method, created_at, payment_received")
	}).Preload("Product", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, title, price, image, business_id")
	}).Preload("Shipment").Preload("ShippingOption")
	
	for field, value := range params {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}
	if err := query.Model(&domain.Order{}).Count(&total).Error; err != nil {
		return nil, err
	}

	if err := query.Order("updated_at desc").Find(&orders).Error; err != nil {
		return nil, err
	}

	return orders, nil
}

func (repo *OrderRepository) GetAll(param map[string]interface{}, isGuest bool) ([]domain.Order, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	var orders []domain.Order
	query := repo.db.Table(tableName).Preload("User").Preload("Items").Preload("Items.Product").Preload("Items.ShippingOption").Preload("Items.Shipment")

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.Find(&orders).Error; err != nil {
		return nil, err
	}

	return orders, nil
}

func (repo *OrderRepository) GetOneOrder(param map[string]interface{}, isGuest bool) (*domain.Order, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	var model domain.Order
	query := repo.db.Table(tableName).Preload("User").Preload("Items").Preload("Items.Product").Preload("Items.ShippingOption").Preload("Items.Shipment")

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.First(&model).Error; err != nil {
		return nil, err
	}

	return &model, nil
}

func (repo *OrderRepository) GetOneOrderItem(param map[string]interface{}, isGuest bool) (*domain.OrderItem, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}

	var model domain.OrderItem
	query := repo.db.Table(tableName).
		Preload("Order", func(db *gorm.DB) *gorm.DB {
			return db.Preload("ShippingProfile.ShippingUser").
				Select("id, invoice, payment_received, created_at, payment_method, shipping_profile_id, user_id")
		}).
		Preload("Order.User").
		Preload("Product", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, title, price, image, business_id")
		}).
		Preload("Shipment").
		Preload("ShippingOption")

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.First(&model).Error; err != nil {
		return nil, err
	}

	return &model, nil
}

func (repo *OrderRepository) ApplyFilters(query *gorm.DB, jsonParams map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParams["search"]) {
		search := "%" + helper.ToString(jsonParams["search"]) + "%"
		queryB := SearchQuery(query, search, repo.SearchField())
		query = queryB
	}

	if helper.NotEmpty(jsonParams["user_id"]) {
		query = query.Where("user_id = ? ", jsonParams["user_id"])
	}

	if helper.NotEmpty(jsonParams["email"]) {
		query = query.Where("email = ? ", jsonParams["email"])
	}

	return query
}

func (repo *OrderRepository) SearchField() []string {
	return []string{"name", "active"}
}

func (repo *OrderRepository) Find(id string, isGuest bool) (*domain.Order, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	var order domain.Order
	if err := repo.db.Table(tableName).Preload(clause.Associations).Where("id = ?", id).First(&order).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (repo *OrderRepository) Create(data *domain.Order, isGuest bool) (*domain.Order, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Begin()

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Table(tableName).Create(data).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	for i := range data.Items {
		data.Items[i].OrderID = data.ID
		data.Items[i].Status = string(helper.OrderStatusPending)

		if err := tx.Updates(&data.Items[i]).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return data, nil
}

func (repo *OrderRepository) UpdateOrder(id string, input domain.Order, isGuest bool) (*domain.Order, error) {
	input.Items = nil
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	input.ID = id

	q := tx.Where("id = ?", id).Updates(input)
	if q.Error != nil {
		tx.Rollback()
		return nil, q.Error
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	var updatedOrder domain.Order
	if err := repo.db.Table(tableName).Where("id = ?", id).First(&updatedOrder).Error; err != nil {
		return nil, err
	}

	return &updatedOrder, nil
}

// ClaimPaymentReceived atomically sets payment_received true only if it is
// currently false, via a single conditional UPDATE. Returns true iff this call
// won the claim (RowsAffected == 1), serialising concurrent verifies so exactly
// one credits the order — the E0.3 double-credit guard.
func (repo *OrderRepository) ClaimPaymentReceived(id string, isGuest bool) (bool, error) {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}
	q := repo.db.Table(tableName).
		Where("id = ? AND payment_received = ?", id, false).
		Update("payment_received", true)
	if q.Error != nil {
		return false, q.Error
	}
	return q.RowsAffected == 1, nil
}

// ClaimOrderItemDelivered atomically transitions an item to "delivered" in a
// single conditional UPDATE (guarded on it not already being delivered) and
// stamps status_updated_at=now, which starts the 24h clearing window the release
// cron reads. Returns true only for the caller that actually flipped it — so a
// double "mark delivered" tap on a Self-delivery order can never move funds to
// the clearing balance twice. Mirrors ClaimPaymentReceived.
func (repo *OrderRepository) ClaimOrderItemDelivered(id string, isGuest bool) (bool, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}
	q := repo.db.Table(tableName).
		Where("id = ? AND status <> ?", id, string(helper.OrderStatusDelivered)).
		Updates(map[string]interface{}{
			"status":            string(helper.OrderStatusDelivered),
			"status_updated_at": time.Now(),
		})
	if q.Error != nil {
		return false, q.Error
	}
	return q.RowsAffected == 1, nil
}

func (repo *OrderRepository) UpdateOrderItem(id string, input domain.OrderItem, isGuest bool) (*domain.OrderItem, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	input.ID = id

	q := tx.Model(&domain.OrderItem{}).Where("id = ?", id).Select("*").Updates(input)
	if q.Error != nil {
		tx.Rollback()
		return nil, q.Error
	}

	var updatedOrder domain.OrderItem
	if err := tx.Where("id = ?", id).First(&updatedOrder).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &updatedOrder, nil
}

// UpdateOrderItemStatus updates only status fields (not activity arrays) to avoid overwriting appended activities
func (repo *OrderRepository) UpdateOrderItemStatus(id string, status string, statusUpdatedAt time.Time, isGuest bool) (*domain.OrderItem, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Only update status and status_updated_at fields - NOT activity arrays
	q := tx.Model(&domain.OrderItem{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":            status,
		"status_updated_at": statusUpdatedAt,
	})
	if q.Error != nil {
		tx.Rollback()
		return nil, q.Error
	}

	var updatedOrder domain.OrderItem
	if err := tx.Where("id = ?", id).First(&updatedOrder).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &updatedOrder, nil
}

func (repo *OrderRepository) Delete(id string) (domain.Order, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *OrderRepository) Model() domain.Order {
	return domain.Order{}
}

func (repo *OrderRepository) ArrayModel() []domain.Order {
	return []domain.Order{}
}

func (repo *OrderRepository) DeleteOrder(id string, isGuest bool) error {
	tableName := "orders"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()
	if err := tx.Where("id = ?", id).Delete(&domain.Order{}).Error; err != nil {
		return err
	}
	return nil
}

func (repo *OrderRepository) AppendActivity(id string, newActivity domain.OrderActivity, activityType string, isGuest bool) (*domain.OrderItem, error) {
	tableName := "order_items"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var existingOrder domain.OrderItem
	selectField := "buyer_activity"
	if activityType == "seller" {
		selectField = "seller_activity"
	}

	if err := tx.Table(tableName).Where("id = ?", id).Select(selectField).First(&existingOrder).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	newActivityEntry := map[string]interface{}{
		"title":    newActivity.Title,
		"details":  newActivity.Details,
		"subtitle": newActivity.Subtitle,
		"time":     newActivity.Time,
	}

	if activityType == "seller" {
		existingOrder.SellerActivity = append(existingOrder.SellerActivity, newActivityEntry)
	} else {
		existingOrder.BuyerActivity = append(existingOrder.BuyerActivity, newActivityEntry)
	}

	updateField := map[string]interface{}{
		"buyer_activity":  existingOrder.BuyerActivity,
		"seller_activity": existingOrder.SellerActivity,
	}[selectField]

	if err := tx.Table(tableName).Where("id = ?", id).Updates(map[string]interface{}{selectField: updateField}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	if err := repo.db.Table(tableName).Where("id = ?", id).First(&existingOrder).Error; err != nil {
		return nil, err
	}

	return &existingOrder, nil
}
