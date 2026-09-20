package mysql_repo

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BusinessRepository struct {
	db *gorm.DB
}

func NewBusinessRepository(db *gorm.DB) ports.BusinessIface {
	return &BusinessRepository{
		db: db,
	}
}

func (repo *BusinessRepository) GetBackgroundSettings(businessID string) (domain.PersonalisedSettings, error) {
	var settings domain.PersonalisedSettings
	err := repo.db.Model(&domain.BusinessSetting{}).
		Select("background_image, background_color, background_state").
		Where("business_id = ?", businessID).
		Scan(&settings).Error
	return settings, err
}

func (repo *BusinessRepository) UpdateBackgroundColor(businessID string, color string, pattern string) error {
	return repo.db.Model(&domain.BusinessSetting{}).
		Where("business_id = ?", businessID).
		UpdateColumns(map[string]interface{}{
			"background_color":   color,
			"background_pattern": pattern,
			"background_state":   "color",
		}).Error
}

// UpdateShippingSettings writes ONLY the two-source shipping columns on the
// seller's business_setting — a targeted UpdateColumns (like the background
// updates) so it can't wipe the theme / legacy shipping fields, and so a partial
// business PUT from another screen can't clobber the shipping config. selfZones
// persists as JSON via domain.SelfZones' Valuer.
func (repo *BusinessRepository) UpdateShippingSettings(businessID string, partnerEnabled bool, selfZones domain.SelfZones) error {
	return repo.db.Model(&domain.BusinessSetting{}).
		Where("business_id = ?", businessID).
		UpdateColumns(map[string]interface{}{
			"partner_enabled": partnerEnabled,
			"self_zones":      selfZones,
		}).Error
}

func (repo *BusinessRepository) UpdateBackgroundImage(businessID string, fileURL string) error {
	return repo.db.Model(&domain.BusinessSetting{}).
		Where("business_id = ?", businessID).
		UpdateColumns(map[string]interface{}{
			"background_image": fileURL,
			"background_state": "image",
		}).Error
}

func (repo *BusinessRepository) DeleteBackgroundImage(businessID string) error {
	return repo.db.Model(&domain.BusinessSetting{}).
		Where("business_id = ?", businessID).
		UpdateColumns(map[string]interface{}{
			"background_image": nil,
			"background_state": "color",
		}).Error
}

func (repo *BusinessRepository) GetAll(param map[string]interface{}) ([]domain.Business, error) {
	model := repo.ArrayModel()

	q := repo.db.Preload("Address").
		Preload("BusinessSetting").
		Preload("BankAccountDetails")

	q = repo.ApplyFilters(q, param)

	q.Find(&model)
	return model, q.Error
}

// vendorHasVisibleProduct restricts the marketplace/discovery vendor list to sellers
// with at least one PUBLICLY-VISIBLE product — active AND in stock. This keeps vendor
// visibility consistent with the product listing (which hides out-of-stock/draft) and
// with the feed's product_count: a vendor whose only products are drafts or sold out
// no longer surfaces with an empty/zero catalog. query + count must use the same clause.
const vendorHasVisibleProduct = "EXISTS (SELECT 1 FROM products WHERE products.business_id = businesses.id AND products.status = 'active' AND COALESCE(products.stock, 0) > 0)"

// GetAllPaginated orders by business with most order items
func (repo *BusinessRepository) GetAllPaginated(search, category string, page, limit int) ([]domain.Business, int64, error) {
	var data []domain.Business
	var total int64

	subQuery := repo.db.
		Table("order_items").
		Select("business_id, COUNT(*) as order_count").
		Group("business_id")

	query := repo.db.
		Model(&domain.Business{}).
		Select("businesses.*, COALESCE(oi.order_count, 0) as order_count").
		Joins("LEFT JOIN (?) AS oi ON oi.business_id = businesses.id", subQuery).
		Preload("Address").
		Preload("BusinessSetting").
		Preload("BankAccountDetails").
		Where(vendorHasVisibleProduct)

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		// Parenthesise the OR so it ANDs with the EXISTS-products guard. Without the
		// outer parens, SQL precedence makes it `EXISTS AND name OR tag OR category`,
		// i.e. `(EXISTS AND name) OR tag OR category`, which leaks vendors that have no
		// products (pre-existing bug — also affected /businesses?search=).
		query = query.Where(`(
			LOWER(businesses.name) ILIKE ? OR
			LOWER(businesses.tag) ILIKE ? OR
			LOWER(businesses.category) ILIKE ?)`,
			searchPattern, searchPattern, searchPattern,
		)
	}
	if category != "" {
		query = query.Where("LOWER(businesses.category) = LOWER(?)", category)
	}

	countQuery := repo.db.Model(&domain.Business{}).
		Where(vendorHasVisibleProduct)
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where(`(
			LOWER(name) ILIKE ? OR
			LOWER(tag) ILIKE ? OR
			LOWER(category) ILIKE ?)`,
			searchPattern, searchPattern, searchPattern,
		)
	}
	if category != "" {
		countQuery = countQuery.Where("LOWER(category) = LOWER(?)", category)
	}
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	// Stable, deterministic ordering so pages don't overlap/skip under equal order counts.
	if err := query.
		Order("order_count DESC, businesses.created_at DESC, businesses.id").
		Limit(limit).
		Offset(offset).
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

func (repo *BusinessRepository) GetOne(param map[string]interface{}) (*domain.Business, error) {
	model := repo.Model()

	q := repo.db.Preload("Address").
		Preload("BusinessSetting").
		Preload("BankAccountDetails")

	for field, value := range param {
		if helper.NotEmpty(value) {
			q = q.Where(field+" = ?", value)
		}
	}

	q.Find(&model)

	return &model, q.Error
}

func (repo *BusinessRepository) GetOneWithExistence(param map[string]interface{}) (*domain.Business, bool, error) {
	model := repo.Model()

	q := repo.db.Preload(clause.Associations)
	for field, value := range param {
		if helper.NotEmpty(value) {
			q = q.Where(field+" = ?", value)
		}
	}

	result := q.First(&model)
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		return nil, false, nil
	}
	if result.Error != nil {
		return nil, false, result.Error
	}

	return &model, true, nil
}

func (repo *BusinessRepository) ApplyFilters(query *gorm.DB, jsonParams map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParams["search"]) {
		search := "%" + helper.ToString(jsonParams["search"]) + "%"
		queryB := SearchQuery(query, search, repo.SearchField())
		query = queryB
	}

	if helper.NotEmpty(jsonParams["phone"]) {
		query = query.Where("phone = ? ", jsonParams["phone"])
	}

	if helper.NotEmpty(jsonParams["email"]) {
		query = query.Where("email = ? ", jsonParams["email"])
	}

	if helper.NotEmpty(jsonParams["user_id"]) {
		query = query.Where("user_id = ? ", jsonParams["user_id"])
	}

	return query
}

func (repo *BusinessRepository) SearchField() []string {
	return []string{"name", "tag", "email"}
}

func (repo *BusinessRepository) Find(id string) (domain.Business, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("id = ?", id).First(&model)

	return model, q.Error
}

// FindByTag resolves a store by its public tag — one indexed, case-insensitive
// lookup (STOREFRONT-URL-REWORK). Replaces the old name-search / 500-row pull as
// the storefront/product URL resolver.
func (repo *BusinessRepository) FindByTag(tag string) (domain.Business, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("LOWER(tag) = LOWER(?)", tag).First(&model)

	return model, q.Error
}

// CountByTag counts businesses holding a tag (case-insensitive), optionally
// excluding one id (so a seller validating their own store's tag isn't blocked
// by themselves). Backs tag-uniqueness validation.
func (repo *BusinessRepository) CountByTag(tag string, excludeID string) (int64, error) {
	var count int64
	q := repo.db.Model(&domain.Business{}).Where("LOWER(tag) = LOWER(?)", tag)
	if excludeID != "" {
		q = q.Where("id != ?", excludeID)
	}
	err := q.Count(&count).Error
	return count, err
}

func (repo *BusinessRepository) Create(data *domain.Business) (domain.Business, error) {
	tx := repo.db.Begin()

	if err := tx.Create(data).Error; err != nil {
		tx.Rollback()
		return *data, err
	}

	var existingWallet domain.Wallet
	err := tx.Where("business_id = ? AND user_id = ?", data.ID, data.UserID).First(&existingWallet).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			wallet := domain.Wallet{
				UserID:           data.UserID,
				BusinessID:       data.ID,
				AvailableBalance: 0,
				ClearingBalance:  0,
				OrdersInProgress: 0,
				Status:           "active",
			}

			if err := tx.Create(&wallet).Error; err != nil {
				tx.Rollback()
				return *data, fmt.Errorf("failed to create wallet: %v", err)
			}
		} else {
			tx.Rollback()
			return *data, fmt.Errorf("failed to check wallet existence: %v", err)
		}
	}

	if err := tx.Commit().Error; err != nil {
		return *data, fmt.Errorf("failed to commit transaction: %v", err)
	}

	return *data, nil
}

func (repo *BusinessRepository) Metric(id string) (interface{}, error) {
	order := domain.Order{}
	today := time.Now()
	yesterday := today.Add(-time.Hour * 24)
	// last seven days
	var prevOrder, currOrder int64

	// Get yesterday order
	q := repo.db.Model(&order).Where("business_id = ?  AND created_at BETWEEN ? AND ? ",
		id, yesterday.Format("2006-01-02"), today.Format("2006-01-02")).Count(&prevOrder)
	// Get today order
	q = repo.db.Model(&order).Where("business_id = ?  AND created_at > ?", id, today.Format("2006-01-02")).Count(&currOrder)

	// Total completed order
	var prevSale, currSale int64
	// Get yesterday order
	q = repo.db.Model(&order).Where("status = 'completed' AND business_id = ?  AND created_at BETWEEN ? AND ? ",
		id, yesterday.Format("2006-01-02"), today.Format("2006-01-02")).Count(&prevSale)
	// Get today order
	q = repo.db.Model(&order).Where("status = 'completed' AND business_id = ?  AND created_at > ?",
		id, today.Format("2006-01-02")).Count(&currSale)

	return map[string]interface{}{
		"orders": map[string]interface{}{
			"today":     currOrder,
			"yesterday": prevOrder,
		},
		"sales": map[string]interface{}{
			"today":     currOrder,
			"yesterday": prevOrder,
		},
		"visitors": map[string]interface{}{
			"today":     currOrder,
			"yesterday": prevOrder,
		},
	}, q.Error
}

func (repo *BusinessRepository) Update(id string, data interface{}) (*domain.Business, error) {
	model := repo.Model()

	// Handle Business Address update separately if present
	if business, ok := data.(domain.Business); ok {
		if business.Address != nil {
			// Update or create the address
			var existingBusiness domain.Business
			if err := repo.db.Preload("Address").Where("id = ?", id).First(&existingBusiness).Error; err != nil {
				return nil, err
			}

			if existingBusiness.Address != nil {
				// Update existing address
				business.Address.BusinessID = id
				if err := repo.db.Model(&domain.BusinessAddress{}).
					Where("business_id = ?", id).
					Updates(business.Address).Error; err != nil {
					return nil, err
				}
			} else {
				// Create new address
				business.Address.BusinessID = id
				if err := repo.db.Create(business.Address).Error; err != nil {
					return nil, err
				}
			}
		}
	}

	// Update the main business fields
	q := repo.db.Model(&model).Where("id = ?", id).Updates(data)
	if q.Error != nil {
		return nil, q.Error
	}

	model, err := repo.Find(id)
	return &model, err
}

func (repo *BusinessRepository) Delete(id string) (domain.Business, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *BusinessRepository) Model() domain.Business {
	return domain.Business{}
}

func (repo *BusinessRepository) ArrayModel() []domain.Business {
	return []domain.Business{}
}

func (repo *BusinessRepository) AddRecentlyViewedBusinesses(inputs []*domain.RecentlyViewedBusiness, isGuest bool) error {
	tableName := "recently_viewed_businesses"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()

	for _, input := range inputs {
		var existing domain.RecentlyViewedBusiness

		err := tx.Where("business_id = ? AND user_id = ?", input.BusinessID, input.UserID).First(&existing).Error
		if err == nil {
			if err := tx.Model(&existing).UpdateColumn("updated_at", time.Now()).Error; err != nil {
				tx.Rollback()
				return err
			}
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := tx.Create(input).Error; err != nil {
				tx.Rollback()
				return err
			}
		} else {
			tx.Rollback()
			return err
		}
	}

	tx.Commit()
	return nil
}

func (repo *BusinessRepository) GetAllRecentlyViewedBusinesses(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.RecentlyViewedBusiness, int64, error) {
	tableName := "recently_viewed_businesses"
	if isGuest {
		tableName += "_guest"
	}

	var data []domain.RecentlyViewedBusiness
	var total int64

	query := repo.db.Table(tableName).
		Preload("Business.Address").
		Preload("Business.BusinessSetting").
		Preload("Products", func(db *gorm.DB) *gorm.DB {
			return db.
				Where("products.status = ?", "active").
				Order("created_at DESC").
				Limit(10).
				Preload("ProductRating")
		})

	query = repo.ApplyFilters(query, params)

	if err := query.Model(&domain.RecentlyViewedBusiness{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Order("updated_at desc").Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

func (repo *BusinessRepository) GetCustomers(businessId string, search string, page, limit int) ([]domain.Customer, int64, error) {
	var customers []domain.Customer
	var total int64

	query := repo.db.
		Table("users").
		Select("users.id, users.firstname, users.lastname, users.user_name, users.profile_image, "+
			"COUNT(DISTINCT orders.id) AS total_orders, "+
			"COALESCE(SUM(CASE WHEN order_items.status NOT IN ('pending', 'cancelled') THEN order_items.price * order_items.quantity ELSE 0 END), 0) AS total_spent, "+
			"COALESCE(MAX(orders.created_at), '0001-01-01') AS last_purchase, "+
			"CASE WHEN MIN(orders.created_at) >= ? THEN TRUE ELSE FALSE END AS is_new", time.Now().AddDate(0, 0, -7).Format("2006-01-02")).
		Joins("INNER JOIN orders ON orders.user_id = users.id").
		Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
		Where("order_items.business_id = ?", businessId).
		Group("users.id, users.firstname, users.lastname, users.user_name, users.profile_image")

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(users.firstname) ILIKE ? OR LOWER(users.lastname) ILIKE ? OR LOWER(users.user_name) ILIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	countQuery := repo.db.
		Table("users").
		Joins("INNER JOIN orders ON orders.user_id = users.id").
		Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
		Where("order_items.business_id = ?", businessId)

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where(
			"LOWER(users.firstname) ILIKE ? OR LOWER(users.lastname) ILIKE ? OR LOWER(users.user_name) ILIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	if err := countQuery.Distinct("users.id").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Find(&customers).Error; err != nil {
		return nil, 0, err
	}

	return customers, total, nil
}

func (repo *BusinessRepository) GetCustomerAnalytics(businessId string, date time.Time) (*domain.AnalyticsResponse, error) {
	response := &domain.AnalyticsResponse{
		Summary:       make(map[string]int),
		PercentChange: make(map[string]float64),
	}

	if businessId == "" {
		return nil, errors.New("invalid business ID")
	}

	err := repo.db.Transaction(func(tx *gorm.DB) error {
		var newCustomers, returningCustomers, activeCustomers, inactiveCustomers int64
		var totalRevenue float64
		var totalCustomers int64

		// new customers - First-time buyers in last 30 days
		if err := tx.Raw(`
			SELECT COUNT(DISTINCT u.user_id) FROM (
				SELECT orders.user_id, MIN(orders.created_at) as first_order
				FROM orders 
				INNER JOIN order_items ON order_items.order_id = orders.id
				WHERE order_items.business_id = ?
				GROUP BY orders.user_id
				HAVING DATE(MIN(orders.created_at)) >= CURRENT_DATE - INTERVAL '30 days'
			) u`, businessId).Scan(&newCustomers).Error; err != nil {
			return err
		}
		response.Summary["new_customers"] = int(newCustomers)

		// returning customers - Customers who have ordered more than once
		if err := tx.Raw(`
			SELECT COUNT(*) FROM (
				SELECT orders.user_id 
				FROM orders 
				INNER JOIN order_items ON order_items.order_id = orders.id
				WHERE order_items.business_id = ?
				GROUP BY orders.user_id
				HAVING COUNT(DISTINCT orders.id) > 1
			) rc`, businessId).Scan(&returningCustomers).Error; err != nil {
			return err
		}
		response.Summary["returning_customers"] = int(returningCustomers)

		// active customers - Customers who ordered in last 30 days
		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.business_id = ? AND orders.created_at >= CURRENT_DATE - INTERVAL '30 days'", businessId).
			Distinct("orders.user_id").
			Count(&activeCustomers).Error; err != nil {
			return err
		}
		response.Summary["active_customers"] = int(activeCustomers)

		// inactive customers - Total customers minus active customers
		var totalUniqueCustomers int64
		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.business_id = ?", businessId).
			Distinct("orders.user_id").
			Count(&totalUniqueCustomers).Error; err != nil {
			return err
		}
		inactiveCustomers = totalUniqueCustomers - activeCustomers
		if inactiveCustomers < 0 {
			inactiveCustomers = 0
		}
		response.Summary["inactive_customers"] = int(inactiveCustomers)

		// average customer value - ALL TIME (item revenue only, excludes shipping)
		if err := tx.Table("order_items").
			Where("order_items.business_id = ? AND order_items.status NOT IN ('pending', 'cancelled')", businessId).
			Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
			Scan(&totalRevenue).Error; err != nil {
			return err
		}

		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.business_id = ?", businessId).
			Distinct("orders.user_id").
			Count(&totalCustomers).Error; err != nil {
			return err
		}

		if totalCustomers > 0 {
			response.Summary["average_customer_value"] = int(totalRevenue / float64(totalCustomers))
		} else {
			response.Summary["average_customer_value"] = 0
		}

		// For cumulative data, we'll show growth trends
		// Set default percentage changes to 0 for now since we're showing all-time data
		response.PercentChange["new_customers"] = 0
		response.PercentChange["returning_customers"] = 0
		response.PercentChange["active_customers"] = 0
		response.PercentChange["inactive_customers"] = 0
		response.PercentChange["average_customer_value"] = 0

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get customer analytics: %w", err)
	}

	return response, nil
}

func (repo *BusinessRepository) GetProductRanking(businessId string, page, limit int) ([]domain.ProductRanking, int64, error) {
	var rankings []domain.ProductRanking
	var total int64

	query := repo.db.
		Table("products").
		Select("products.id, products.title, products.description, products.slug, products.image, "+
			"COALESCE(COUNT(DISTINCT CASE WHEN order_items.status NOT IN ('pending', 'cancelled') THEN order_items.id END), 0) AS total_orders, "+
			"COALESCE((SELECT COUNT(*) FROM recently_viewed_products WHERE recently_viewed_products.product_id = products.id), 0) AS total_views, "+
			"COALESCE(SUM(CASE WHEN order_items.status NOT IN ('pending', 'cancelled') THEN order_items.price * order_items.quantity ELSE 0 END), 0) AS total_sales, "+
			"COALESCE(products.stock, 0) AS stock").
		Joins("LEFT JOIN order_items ON order_items.product_id = products.id").
		Where("products.business_id = ?", businessId).
		Group("products.id, products.title, products.description, products.slug, products.image, products.stock").
		Order("total_sales DESC")

	countQuery := repo.db.
		Table("products").
		Where("products.business_id = ?", businessId)

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Find(&rankings).Error; err != nil {
		return nil, 0, err
	}

	return rankings, total, nil
}

func (repo *BusinessRepository) GetDashboardAnalytics(businessId string) (*domain.AnalyticsResponse, error) {
	response := &domain.AnalyticsResponse{
		Summary:       make(map[string]int),
		PercentChange: make(map[string]float64),
	}

	today := time.Now()
	dateStr := today.Format("2006-01-02")

	yesterday := today.AddDate(0, 0, -1)

	err := repo.db.Transaction(func(tx *gorm.DB) error {
		// store visitors - today only
		var storeVisitors int64
		if err := tx.Table("recently_viewed_businesses").
			Where("business_id = ? AND DATE(created_at) = ?", businessId, dateStr).
			Count(&storeVisitors).Error; err != nil {
			response.Summary["store_visitors"] = 0
		} else {
			response.Summary["store_visitors"] = int(storeVisitors)
		}

		// revenue generated - ALL TIME (cumulative) - item revenue only, excludes shipping
		var revenueGenerated float64
		if err := tx.Table("order_items").
			Where("order_items.business_id = ? AND order_items.status NOT IN ('pending', 'cancelled')", businessId).
			Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
			Scan(&revenueGenerated).Error; err != nil {
			return err
		}
		response.Summary["revenue_generated"] = int(revenueGenerated)

		// total orders - ALL TIME (cumulative)
		var totalOrders int64
		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.business_id = ?", businessId).
			Count(&totalOrders).Error; err != nil {
			return err
		}
		response.Summary["total_orders"] = int(totalOrders)

		// total sales - ALL TIME (cumulative)
		var totalSales int64
		if err := tx.Table("order_items").
			Joins("INNER JOIN orders ON orders.id = order_items.order_id").
			Where("order_items.status NOT IN ('pending', 'cancelled')").
			Where("order_items.business_id = ?", businessId).
			Select("COALESCE(SUM(order_items.quantity), 0)").
			Scan(&totalSales).Error; err != nil {
			return err
		}
		response.Summary["total_sales"] = int(totalSales)

		calculatePercentChange := func(current, previous int) float64 {
			if previous == 0 {
				return 0
			}
			return float64(current-previous) / float64(previous) * 100
		}

		yesterdayStr := yesterday.Format("2006-01-02")
		var yesterdayData struct {
			StoreVisitors int64
			TodayOrders   int64
			TodayRevenue  float64
			TodaySales    int64
		}

		// Get today-specific data for percentage comparison
		if err := tx.Raw(`
		SELECT
			(SELECT COUNT(*) FROM recently_viewed_businesses
			 WHERE business_id = ? AND DATE(created_at) = ?) AS store_visitors,

			(SELECT COUNT(*) FROM orders
			 JOIN order_items ON order_items.order_id = orders.id
			 WHERE order_items.business_id = ? AND DATE(orders.created_at) = ?) AS today_orders,

			(SELECT COALESCE(SUM(order_items.price * order_items.quantity), 0) FROM order_items
			 WHERE order_items.business_id = ? AND DATE(order_items.created_at) = ?
			 AND order_items.status NOT IN ('pending', 'cancelled')) AS today_revenue,

			(SELECT COALESCE(SUM(order_items.quantity), 0) FROM order_items
			 JOIN orders ON orders.id = order_items.order_id
			 WHERE order_items.business_id = ? AND DATE(orders.created_at) = ?
			 AND order_items.status NOT IN ('pending', 'cancelled')) AS today_sales
			`,
			businessId, yesterdayStr,
			businessId, yesterdayStr,
			businessId, yesterdayStr,
			businessId, yesterdayStr,
		).Scan(&yesterdayData).Error; err != nil {
			return err
		}

		// Calculate percentage changes comparing today vs yesterday
		var todayStoreVisitors, todayOrders, todayRevenue, todaySales int64

		// Get today's data for comparison
		tx.Table("recently_viewed_businesses").
			Where("business_id = ? AND DATE(created_at) = ?", businessId, dateStr).
			Count(&todayStoreVisitors)

		tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.business_id = ? AND DATE(orders.created_at) = ?", businessId, dateStr).
			Count(&todayOrders)

		var todayRevenueFloat float64
		tx.Table("order_items").
			Where("order_items.business_id = ? AND DATE(order_items.created_at) = ? AND order_items.status NOT IN ('pending', 'cancelled')", businessId, dateStr).
			Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
			Scan(&todayRevenueFloat)
		todayRevenue = int64(todayRevenueFloat)

		tx.Table("order_items").
			Joins("INNER JOIN orders ON orders.id = order_items.order_id").
			Where("order_items.business_id = ? AND DATE(orders.created_at) = ? AND order_items.status NOT IN ('pending', 'cancelled')", businessId, dateStr).
			Select("COALESCE(SUM(order_items.quantity), 0)").
			Scan(&todaySales)

		response.PercentChange["store_visitors"] = calculatePercentChange(
			int(todayStoreVisitors), int(yesterdayData.StoreVisitors))

		response.PercentChange["revenue_generated"] = calculatePercentChange(
			int(todayRevenue), int(yesterdayData.TodayRevenue))

		response.PercentChange["total_orders"] = calculatePercentChange(
			int(todayOrders), int(yesterdayData.TodayOrders))

		response.PercentChange["total_sales"] = calculatePercentChange(
			int(todaySales), int(yesterdayData.TodaySales))

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard analytics: %w", err)
	}

	return response, nil

}

func (repo *BusinessRepository) GetSalesAnalytics(businessId string, date time.Time) (*domain.AnalyticsResponse, error) {
	response := &domain.AnalyticsResponse{
		Summary:       make(map[string]int),
		PercentChange: make(map[string]float64),
	}

	dateStr := date.Format("2006-01-02")
	if businessId == "" {
		return nil, errors.New("invalid business ID")
	}

	err := repo.db.Transaction(func(tx *gorm.DB) error {
		// store visitors
		var storeVisitors int64
		if err := tx.Table("recently_viewed_businesses").
			Where("business_id = ? AND DATE(created_at) = ?", businessId, dateStr).
			Count(&storeVisitors).Error; err != nil {
			response.Summary["store_visitors"] = 0
		} else {
			response.Summary["store_visitors"] = int(storeVisitors)
		}

		// total sales amount - ALL TIME (cumulative)
		// NOTE: Only sum item prices, NOT orders.total which includes shipping costs
		// Shipping costs go to the courier, not the vendor
		var totalSales float64
		if err := tx.Table("order_items").
			Where("order_items.status NOT IN ('pending', 'cancelled')").
			Where("order_items.business_id = ?", businessId).
			Select("COALESCE(SUM(order_items.price * order_items.quantity), 0)").
			Scan(&totalSales).Error; err != nil {
			return err
		}
		response.Summary["total_sales"] = int(totalSales)

		// cancelled orders - ALL TIME (cumulative)
		var cancelledOrders int64
		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.status = 'cancelled'").
			Where("order_items.business_id = ?", businessId).
			Count(&cancelledOrders).Error; err != nil {
			return err
		}
		response.Summary["cancelled_orders"] = int(cancelledOrders)

		// total orders - ALL TIME (cumulative)
		var totalOrders int64
		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.business_id = ?", businessId).
			Count(&totalOrders).Error; err != nil {
			return err
		}
		response.Summary["total_orders"] = int(totalOrders)

		// active orders - CURRENT (not completed or cancelled)
		var activeOrders int64
		if err := tx.Table("orders").
			Joins("INNER JOIN order_items ON order_items.order_id = orders.id").
			Where("order_items.status NOT IN ('completed', 'cancelled')").
			Where("order_items.business_id = ?", businessId).
			Count(&activeOrders).Error; err != nil {
			return err
		}
		response.Summary["active_orders"] = int(activeOrders)

		// average order value
		var avgOrderValue float64
		if totalOrders > 0 {
			avgOrderValue = totalSales / float64(totalOrders)
		}
		response.Summary["average_order_value"] = int(avgOrderValue)

		// For cumulative data, set all percentage changes to 0
		response.PercentChange["store_visitors"] = 0
		response.PercentChange["total_sales"] = 0
		response.PercentChange["cancelled_orders"] = 0
		response.PercentChange["total_orders"] = 0
		response.PercentChange["active_orders"] = 0
		response.PercentChange["average_order_value"] = 0

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get sales analytics: %w", err)
	}

	return response, nil
}

func (repo *BusinessRepository) Follow(businessId, userId string, isGuest bool) error {
	tableName := "followers"
	if isGuest {
		tableName += "_guest"
	}

	var count int64
	repo.db.Table(tableName).
		Where("business_id = ? AND user_id = ?", businessId, userId).
		Count(&count)

	if count > 0 {
		return nil
	}

	follower := domain.Follower{
		BusinessID: businessId,
		UserID:     userId,
	}
	return repo.db.Create(&follower).Error
}

func (repo *BusinessRepository) UnFollow(businessId, userId string, isGuest bool) error {
	tableName := "followers"
	if isGuest {
		tableName += "_guest"
	}

	return repo.db.Table(tableName).Where("business_id = ? AND user_id = ?", businessId, userId).Delete(&domain.Follower{}).Error
}

func (repo *BusinessRepository) GetFollowers(params map[string]interface{}, search string, page, limit int) ([]domain.Follower, int64, error) {
	var followers []domain.Follower
	var total int64

	query := repo.db.Table("followers").
		Joins("INNER JOIN users ON users.id = followers.user_id").
		Joins("INNER JOIN businesses ON businesses.id = followers.business_id")

	for key, value := range params {
		query = query.Where(key+" = ?", value)
	}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(users.firstname) ILIKE ? OR LOWER(users.lastname) ILIKE ? OR LOWER(users.user_name) ILIKE ? OR LOWER(businesses.name) ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	query = query.Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, firstname, lastname, user_name")
	})

	query = query.Preload("Business", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name")
	})

	countQuery := repo.db.Table("followers").
		Joins("INNER JOIN users ON users.id = followers.user_id").
		Joins("INNER JOIN businesses ON businesses.id = followers.business_id")

	for key, value := range params {
		countQuery = countQuery.Where(key+" = ?", value)
	}

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where(
			"LOWER(users.firstname) ILIKE ? OR LOWER(users.lastname) ILIKE ? OR LOWER(users.user_name) ILIKE ? OR LOWER(businesses.name) ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Find(&followers).Error; err != nil {
		return nil, 0, err
	}

	return followers, total, nil
}

func (repo *BusinessRepository) GetStoreAnalytics(businessId string) (*domain.StoreAnalyticsResponse, error) {
	fmt.Println("businessId; ", businessId)
	var analytics domain.StoreAnalyticsResponse

	if err := repo.db.Table("followers").
		Where("business_id = ?", businessId).
		Count(&analytics.FollowersCount).Error; err != nil {
		return nil, err
	}

	if err := repo.db.Table("product_ratings").
		Select("COALESCE(AVG(rate), 0)").
		Joins("INNER JOIN products ON products.id = product_ratings.product_id").
		Where("products.business_id = ?", businessId).
		Scan(&analytics.Ratings).Error; err != nil {
		return nil, err
	}

	// Products Sold - count all completed sales (not pending/cancelled)
	if err := repo.db.Table("order_items").
		Where("business_id = ? AND status NOT IN ('pending', 'cancelled')", businessId).
		Count(&analytics.ProductsSold).Error; err != nil {
		return nil, err
	}

	// get average order preparation time from order_items between when an order is created and when the shipment is created
	if err := repo.db.Table("order_items").
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (shipments.created_at - order_items.created_at)) / 3600), 0)").
		Joins("INNER JOIN shipments ON shipments.id = order_items.shipment_id").
		Where("order_items.business_id = ?", businessId).
		Scan(&analytics.AvgOrderPrepTime).Error; err != nil {
		return nil, err
	}

	// average delivery time from order_items
	if err := repo.db.Table("order_items").
		Select("COALESCE(AVG(EXTRACT(EPOCH FROM (order_items.updated_at - shipments.created_at)) / 86400), 0)").
		Joins("INNER JOIN shipments ON shipments.id = order_items.shipment_id").
		Where("order_items.business_id = ? AND order_items.status = ?", businessId, "delivered").
		Scan(&analytics.AvgDeliveryTime).Error; err != nil {
		return nil, err
	}

	// fulfillment rate: (orders delivered / total completed orders) * 100
	var totalOrders, totalDelivered int64
	if err := repo.db.Table("order_items").
		Where("business_id = ? AND status NOT IN ('pending', 'cancelled')", businessId).
		Count(&totalOrders).Error; err != nil {
		return nil, err
	}

	if err := repo.db.Table("order_items").
		Where("business_id = ? AND status = ?", businessId, "delivered").
		Count(&totalDelivered).Error; err != nil {
		return nil, err
	}

	if totalOrders > 0 {
		analytics.FulfilmentRate = int64((float64(totalDelivered) / float64(totalOrders)) * 100)
	} else {
		analytics.FulfilmentRate = 0
	}

	return &analytics, nil
}

func (repo *BusinessRepository) FindAccountDetailsByIDAndBusiness(id string, businessID string) (*domain.BusinessBankAccountDetail, error) {
	var account domain.BusinessBankAccountDetail
	err := repo.db.Where("id = ? AND business_id = ?", id, businessID).First(&account).Error
	if err != nil {
		return nil, err
	}
	return &account, nil
}

func (repo *BusinessRepository) UnsetOtherDefaultAccounts(businessID string) error {
	return repo.db.Model(&domain.BusinessBankAccountDetail{}).
		Where("business_id = ?", businessID).
		Update("is_default", false).Error
}

func (repo *BusinessRepository) UpdateAccountDetails(id string, data domain.BusinessBankAccountDetail) error {
	return repo.db.Model(&domain.BusinessBankAccountDetail{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"bank":           data.Bank,
			"account_number": data.AccountNumber,
			"account_name":   data.AccountName,
			// `bank_id` — there is no such column, only `bank_code`. Postgres
			// rejected the whole statement, so EVERY edit of a payout bank
			// account failed with "something went wrong" while the seller was
			// looking at correct details. Verified against the live schema.
			"bank_code":  data.BankCode,
			"is_default": data.IsDefault,
			// Changing the account invalidates the cached Paystack recipient:
			// it still points at the OLD bank account, so reusing it would pay
			// the previous destination. Cleared here, in the same statement as
			// the change, and re-registered by the caller.
			"paystack_recipient_code": "",
		}).Error
}

func (repo *BusinessRepository) CreateBankAccount(data *domain.BusinessBankAccountDetail) error {
	return repo.db.Create(data).Error
}

func (repo *BusinessRepository) AppendAccountDetailsMetadata(Id string, newMetadata map[string]interface{}) error {
	var account domain.BusinessBankAccountDetail
	if err := repo.db.Where("id = ?", Id).First(&account).Error; err != nil {
		return err
	}
	found := false
	for idx, item := range account.Metadata {
		for key := range newMetadata {
			if _, ok := item[key]; ok {
				account.Metadata[idx][key] = newMetadata[key]
				found = true
			}
		}
	}
	if !found {
		account.Metadata = append(account.Metadata, newMetadata)
	}
	if err := repo.db.Model(&account).Update("metadata", account.Metadata).Error; err != nil {
		return err
	}
	return nil
}

func (repo *BusinessRepository) GetBankAccounts(businessId string, limit int, offset int) ([]domain.BusinessBankAccountDetail, int64, error) {
	var accounts []domain.BusinessBankAccountDetail
	var total int64

	q := repo.db.Model(&domain.BusinessBankAccountDetail{})

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := q.Limit(limit).Offset(offset).Order("created_at desc").
		Where("business_id = ?", businessId).
		Find(&accounts).Error; err != nil {
		return nil, 0, err
	}

	return accounts, total, nil
}

func (repo *BusinessRepository) FindBankAccount(filters map[string]interface{}) (*domain.BusinessBankAccountDetail, error) {
	var account domain.BusinessBankAccountDetail
	err := repo.db.Where(filters).First(&account).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &account, nil
}

func (repo *BusinessRepository) DeleteBankAccount(id string, businessID string) error {
	return repo.db.Where("id = ? AND business_id = ?", id, businessID).Delete(&domain.BusinessBankAccountDetail{}).Error
}

func (repo *BusinessRepository) GetAllBusinesses(search string, page, limit int) ([]domain.Business, int64, error) {
	var businesses []domain.Business
	var total int64

	offset := (page - 1) * limit

	q := repo.db.Model(&domain.Business{})

	if search != "" {
		likeSearch := "%" + search + "%"
		q = q.Where("name ILIKE ? OR email ILIKE ? OR phone ILIKE ?", likeSearch, likeSearch, likeSearch)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Preload("Address").
		Preload("BusinessSetting").
		Preload("BankAccountDetails").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&businesses).Error
	if err != nil {
		return nil, 0, err
	}

	return businesses, total, nil
}
