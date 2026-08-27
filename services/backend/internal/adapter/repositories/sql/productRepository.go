package mysql_repo

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ports.ProductRepoIface {
	return &ProductRepository{
		db: db,
	}
}

func (repo *ProductRepository) GetAll(param map[string]interface{}) ([]domain.Product, error) {
	model := repo.ArrayModel()

	q := repo.db.
		Preload("Variants").
		Preload("Category").
		Preload("SubCategory").
		Preload("Collections").
		Preload("ProductRating").
		Preload("Discounts")

	q = repo.ApplyFilters(q, param)

	q.Find(&model)
	return model, q.Error
}

func (repo *ProductRepository) GetOne(param map[string]interface{}) (*domain.Product, error) {
	var data domain.Product
	q := repo.db.Model(&domain.Product{})
	q = repo.db.
		Preload("Variants").
		Preload("Category").
		Preload("SubCategory").
		Preload("Collections").
		Preload("ProductRating").
		Preload("Discounts")

	for key, value := range param {
		if value != nil {
			q = q.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}

	if err := q.First(&data).Error; err != nil {
		return nil, err
	}
	return &data, nil
}

// GetOneWithAssociations returns a single product with properly loaded associations
// This method uses the same pattern as Find() to ensure variant custom properties are loaded
func (repo *ProductRepository) GetOneWithAssociations(param map[string]interface{}) (*domain.Product, error) {
	model := repo.Model()
	q := repo.db.
		Preload("Variants").
		Preload("Category").
		Preload("SubCategory").
		Preload("Collections").
		Preload("ProductRating").
		Preload("Discounts")

	for key, value := range param {
		if value != nil {
			q = q.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}

	if err := q.First(&model).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

// GetAllPaginated returns paginated products ordered by most sold (via order_items)
// with optional search functionality
// inStockClause identifies a product with available stock. Uses the top-level
// products.stock column: variant per-combination stock (variants.stock_values) is
// currently unpopulated, and variant products carry their stock at the product level.
// Revisit if/when per-combination stock is enabled.
const inStockClause = "COALESCE(products.stock, 0) > 0"

func (repo *ProductRepository) GetAllPaginated(params map[string]interface{}, search string, page, limit int, inStockOnly bool) ([]domain.Product, int64, error) {
	var data []domain.Product
	var total int64

	subQuery := repo.db.
		Table("order_items").
		Select("product_id, COUNT(*) as order_count").
		Group("product_id")

	query := repo.db.
		Model(&domain.Product{}).
		Select("products.*, COALESCE(oi.order_count, 0) as order_count").
		Joins("LEFT JOIN (?) AS oi ON oi.product_id = products.id", subQuery).
		Preload("Variants").
		Preload("Category").
		Preload("SubCategory").
		Preload("Collections").
		Preload("ProductRating").
		Preload("Discounts")

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(products.title) LIKE ? OR "+
				"LOWER(products.slug) LIKE ? OR "+
				"LOWER(products.sku) LIKE ? OR "+
				"LOWER(products.description) LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	for field, value := range params {
		if !helper.NotEmpty(value) || field == "page" || field == "limit" {
			continue
		}
		if field == "tag" {
			// tag is a jsonb array — match products whose array CONTAINS the value.
			tagJSON, _ := json.Marshal([]interface{}{value})
			query = query.Where("products.tag @> ?::jsonb", string(tagJSON))
			continue
		}
		query = query.Where("products."+field+" = ?", value)
	}

	if inStockOnly {
		query = query.Where(inStockClause)
	}

	countQuery := repo.db.Model(&domain.Product{})
	if inStockOnly {
		countQuery = countQuery.Where(inStockClause)
	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where(
			"LOWER(products.title) LIKE ? OR "+
				"LOWER(products.slug) LIKE ? OR "+
				"LOWER(products.sku) LIKE ? OR "+
				"LOWER(products.description) LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	for field, value := range params {
		if !helper.NotEmpty(value) || field == "page" || field == "limit" {
			continue
		}
		if field == "tag" {
			tagJSON, _ := json.Marshal([]interface{}{value})
			countQuery = countQuery.Where("products.tag @> ?::jsonb", string(tagJSON))
			continue
		}
		countQuery = countQuery.Where("products."+field+" = ?", value)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.
		Order("order_count DESC").
		Limit(limit).
		Offset(offset).
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

// GetDistinctTags returns the distinct tags across a business's VISIBLE products —
// active AND in stock (COALESCE(stock,0) > 0), matching the storefront listing so a
// chip can't surface a tag that only sold-out products carry (which would render an
// empty grid). Source for the storefront's filter chips (P16).
func (repo *ProductRepository) GetDistinctTags(businessId string) ([]string, error) {
	var tags []string
	err := repo.db.Raw(
		`SELECT DISTINCT jsonb_array_elements_text(tag) AS t
		 FROM products
		 WHERE business_id = ? AND status = ? AND COALESCE(stock, 0) > 0 AND tag IS NOT NULL AND jsonb_typeof(tag) = 'array'
		 ORDER BY t`,
		businessId, string(helper.ProductStatusActive),
	).Scan(&tags).Error
	if err != nil {
		return nil, err
	}
	return tags, nil
}

func (repo *ProductRepository) GetAllPaginatedWithContext(
	userId string,
	isGuest bool,
	params map[string]interface{},
	search, context string,
	page, limit int,
) ([]domain.Product, int64, error) {
	var data []domain.Product
	var total int64

	query := repo.db.
		Model(&domain.Product{}).
		Select("products.*, COALESCE(oi.order_count, 0) as order_count").
		Joins("LEFT JOIN (?) AS oi ON oi.product_id = products.id", repo.db.
			Table("order_items").
			Select("product_id, COUNT(*) as order_count").
			Group("product_id")).
		Group("products.id, oi.order_count").
		Preload("Variants").
		Preload("Category").
		Preload("SubCategory").
		Preload("Collections").
		Preload("ProductRating").
		Preload("Discounts")

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		query = query.Where(
			"LOWER(products.title) LIKE ? OR "+
				"LOWER(products.slug) LIKE ? OR "+
				"LOWER(products.sku) LIKE ? OR "+
				"LOWER(products.description) LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	for field, value := range params {
		if !helper.NotEmpty(value) || field == "page" || field == "limit" {
			continue
		}
		if field == "tag" {
			tagJSON, _ := json.Marshal([]interface{}{value})
			query = query.Where("products.tag @> ?::jsonb", string(tagJSON))
			continue
		}
		query = query.Where("products."+field+" = ?", value)
	}
	// Buyer-facing (v2 context feed) — hide out-of-stock like the v1 storefront.
	query = query.Where(inStockClause)
	countQuery := repo.db.Model(&domain.Product{}).Where(inStockClause)

	now := time.Now()

	switch context {
	case "trending_items":
		sixHoursAgo := now.Add(-6 * time.Hour)
		query = query.
			Joins("JOIN order_items oi2 ON oi2.product_id = products.id").
			Where("oi2.created_at >= ?", sixHoursAgo)

	case "new_arrivals":
		twoDaysAgo := now.Add(-48 * time.Hour)
		query = query.Where("products.created_at >= ?", twoDaysAgo)

	case "personalized_directory":
		if isGuest {
			return repo.GetAllPaginated(params, search, page, limit, true)
		}

		var preferredCategoryIDs []string
		err := repo.db.
			Table("orders").
			Select("DISTINCT products.category_id").
			Joins("JOIN order_items ON orders.id = order_items.order_id").
			Joins("JOIN products ON order_items.product_id = products.id").
			Where("orders.user_id = ?", userId).
			Limit(5).
			Pluck("products.category_id", &preferredCategoryIDs).Error

		if err != nil {
			return nil, 0, err
		}

		if len(preferredCategoryIDs) > 0 {
			query = query.Where("products.category_id IN ?", preferredCategoryIDs)
			countQuery = countQuery.Where("products.category_id IN ?", preferredCategoryIDs)
		} else {
			return repo.GetAllPaginated(params, search, page, limit, true)
		}

	}

	if search != "" {
		searchTerm := "%" + strings.ToLower(search) + "%"
		countQuery = countQuery.Where(
			"LOWER(products.title) LIKE ? OR "+
				"LOWER(products.slug) LIKE ? OR "+
				"LOWER(products.sku) LIKE ? OR "+
				"LOWER(products.description) LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	for field, value := range params {
		if !helper.NotEmpty(value) || field == "page" || field == "limit" {
			continue
		}
		if field == "tag" {
			tagJSON, _ := json.Marshal([]interface{}{value})
			countQuery = countQuery.Where("products.tag @> ?::jsonb", string(tagJSON))
			continue
		}
		countQuery = countQuery.Where("products."+field+" = ?", value)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.
		Order("order_count DESC").
		Limit(limit).
		Offset(offset).
		Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

func (repo *ProductRepository) GetTopVendors(page, limit int) ([]domain.Business, int64, error) {
	var businesses []domain.Business
	var total int64

	sevenDaysAgo := time.Now().Add(-7 * 24 * time.Hour)

	subQuery := repo.db.
		Table("order_items").
		Select("products.business_id, COUNT(*) as sales").
		Joins("JOIN products ON products.id = order_items.product_id").
		Where("order_items.created_at >= ?", sevenDaysAgo).
		Group("products.business_id")

	query := repo.db.
		Model(&domain.Business{}).
		Select("businesses.*, COALESCE(sq.sales, 0) as sales").
		Joins("JOIN (?) AS sq ON sq.business_id = businesses.id", subQuery).
		Order("sales DESC")

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&businesses).Error; err != nil {
		return nil, 0, err
	}

	return businesses, total, nil
}

func (repo *ProductRepository) ApplyFilters(query *gorm.DB, jsonParam map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParam["search"]) {
		search := "%" + helper.ToString(jsonParam["search"]) + "%"
		queryB := SearchQuery(query, search, repo.SearchField())
		query = queryB
	}

	if helper.NotEmpty(jsonParam["phone"]) {
		query = query.Where("phone = ? ", jsonParam["phone"])
	}

	if helper.NotEmpty(jsonParam["email"]) {
		query = query.Where("email = ? ", jsonParam["email"])
	}

	if jsonParam["phone"] != nil {
		query.Where("phone = ?", jsonParam["phone"])
	}

	if jsonParam["description"] != nil {
		query.Where("description LIKE '%?%", jsonParam["description"])
	}

	if jsonParam["category_id"] != nil {
		query.Where("category_id = ?", jsonParam["category_id"])
	}
	if jsonParam["business_id"] != nil {
		query.Where("business_id = ?", jsonParam["business_id"])
	}
	if jsonParam["user_id"] != nil {
		query.Where("user_id = ?", jsonParam["user_id"])
	}
	if jsonParam["status"] != nil {
		query.Where("status = ?", jsonParam["status"])
	}

	return query
}

func (repo *ProductRepository) SearchField() []string {
	return []string{"name", "description"}
}

func (repo *ProductRepository) Find(id string) (domain.Product, error) {
	model := repo.Model()
	q := repo.db.
		Preload("Variants").
		Preload("Category").
		Preload("SubCategory").
		Preload("Collections").
		Preload("ProductRating").
		Preload("Discounts").
		Where("id = ?", id).First(&model)

	return model, q.Error
}

func (repo *ProductRepository) Create(data *domain.Product) (domain.Product, error) {
	var createdProduct domain.Product

	err := repo.db.Transaction(func(tx *gorm.DB) error {
		// 1. Extract variants before creating product
		variants := data.Variants
		data.Variants = nil

		// 2. Create product without variants
		if err := tx.Create(data).Error; err != nil {
			return fmt.Errorf("failed to create product: %w", err)
		}

		// 2.5. Force update boolean field (GORM ignores zero values for booleans)
		if err := tx.Model(&domain.Product{}).Where("id = ?", data.ID).Update("is_combination", data.IsCombination).Error; err != nil {
			return fmt.Errorf("failed to update is_combination: %w", err)
		}

		// 3. Set ProductID for all variants and associate them
		if len(variants) > 0 {
			for i := range variants {
				variants[i].ProductID = data.ID
			}
			if err := tx.Model(data).Association("Variants").Replace(variants); err != nil {
				return fmt.Errorf("failed to create variants: %w", err)
			}
		}

		// 4. Return created product with associations
		if err := tx.Preload("Variants").First(&createdProduct, "id = ?", data.ID).Error; err != nil {
			return fmt.Errorf("failed to fetch created product: %w", err)
		}

		return nil
	})

	if err != nil {
		return domain.Product{}, err
	}

	return createdProduct, nil
}

func (repo *ProductRepository) Update(id string, data domain.Product) (*domain.Product, error) {
	var updatedProduct domain.Product

	err := repo.db.Transaction(func(tx *gorm.DB) error {
		// 1. Update main product fields
		if err := tx.Model(&domain.Product{}).Where("id = ?", id).Updates(data).Error; err != nil {
			return fmt.Errorf("failed to update product fields: %w", err)
		}

		// 2. Force update boolean field (GORM ignores zero values)
		if err := tx.Model(&domain.Product{}).Where("id = ?", id).Update("is_combination", data.IsCombination).Error; err != nil {
			return fmt.Errorf("failed to update is_combination: %w", err)
		}

		// 3. Handle variants association
		product := domain.Product{}
		product.ID = id

		if len(data.Variants) > 0 {
			// Set ProductID for all variants
			for i := range data.Variants {
				data.Variants[i].ProductID = id
			}
			if err := tx.Model(&product).Association("Variants").Replace(data.Variants); err != nil {
				return fmt.Errorf("failed to replace variants: %w", err)
			}
		} else {
			// Clear variants if empty
			if err := tx.Model(&product).Association("Variants").Clear(); err != nil {
				return fmt.Errorf("failed to clear variants: %w", err)
			}
		}

		// 4. Variant combinations removed - backend calculates combinations on-demand from variants

		// 5. Return updated product with associations
		if err := tx.Preload("Variants").First(&updatedProduct, "id = ?", id).Error; err != nil {
			return fmt.Errorf("failed to fetch updated product: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &updatedProduct, nil
}

func (repo *ProductRepository) Delete(id string) (domain.Product, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *ProductRepository) Model() domain.Product {
	return domain.Product{}
}

func (repo *ProductRepository) ArrayModel() []domain.Product {
	return []domain.Product{}
}

func (repo *ProductRepository) GetAllProductWishlist(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.ProductWishlist, int64, error) {
	tableName := "product_wishlists"
	if isGuest {
		tableName += "_guest"
	}

	var data []domain.ProductWishlist
	var total int64

	query := repo.db.Table(tableName).
		Preload("Product").
		Preload("Product.Variants").
		Preload("Product.Category").
		Preload("Product.SubCategory")
	query = repo.ApplyFilters(query, params)

	if err := query.Model(&domain.ProductWishlist{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Order("updated_at desc").Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

func (repo *ProductRepository) FindProductWishlistByFields(filters map[string]interface{}, isGuest bool) (*domain.ProductWishlist, error) {
	tableName := "product_wishlists"
	if isGuest {
		tableName += "_guest"
	}

	var data domain.ProductWishlist
	query := repo.db.Table(tableName).
		Preload("Product").
		Preload("Product.Variants").
		Preload("Product.Category").
		Preload("Product.SubCategory")

	for field, value := range filters {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.First(&data).Error; err != nil {
		return nil, err
	}

	return &data, nil
}

func (repo *ProductRepository) AddProductWishlist(input *domain.ProductWishlist, isGuest bool) (*domain.ProductWishlist, error) {
	tableName := "product_wishlists"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()

	if err := tx.Create(&input).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()
	return input, nil
}

func (repo *ProductRepository) DeleteProductWishlist(id string, isGuest bool) error {
	tableName := "product_wishlists"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()

	if err := tx.Where("id = ?", id).Delete(&domain.ProductWishlist{}).Error; err != nil {
		return err
	}
	tx.Commit()
	return nil
}

func (repo *ProductRepository) AddRecentlyViewedProducts(inputs []*domain.RecentlyViewedProduct, isGuest bool) error {
	tableName := "recently_viewed_products"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()

	for _, input := range inputs {
		var existing domain.RecentlyViewedProduct

		err := tx.Where("product_id = ? AND user_id = ?", input.ProductID, input.UserID).First(&existing).Error
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

func (repo *ProductRepository) IncrementProductSales(productID string, incrementBy int) error {
	err := repo.db.Transaction(func(tx *gorm.DB) error {
		var product domain.Product
		if err := tx.First(&product, "id = ?", productID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("product not found")
			}
			return fmt.Errorf("failed to fetch product: %w", err)
		}

		if err := tx.Model(&domain.Product{}).
			Where("id = ?", productID).
			Update("sales", gorm.Expr("COALESCE(sales, 0) + ?", incrementBy)).
			Error; err != nil {
			return fmt.Errorf("failed to increment sales: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("transaction failed: %w", err)
	}

	return nil
}

func (repo *ProductRepository) DecrementProductStock(productID string, decrementBy int) error {
	err := repo.db.Transaction(func(tx *gorm.DB) error {
		var product domain.Product
		if err := tx.First(&product, "id = ?", productID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("product not found")
			}
			return fmt.Errorf("failed to fetch product: %w", err)
		}

		if err := tx.Model(&domain.Product{}).
			Where("id = ?", productID).
			Update("stock", gorm.Expr("COALESCE(sales, 0) - ?", decrementBy)).
			Error; err != nil {
			return fmt.Errorf("failed to increment sales: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("transaction failed: %w", err)
	}

	return nil
}

func (repo *ProductRepository) DeleteVariantsByProductID(productID string) error {
	return repo.db.Transaction(func(tx *gorm.DB) error {
		// Variant combinations removed - backend calculates combinations on-demand from variants

		// Delete variants
		if err := tx.Where("product_id = ?", productID).Delete(&domain.Variant{}).Error; err != nil {
			return fmt.Errorf("failed to delete variants: %w", err)
		}

		return nil
	})
}
