package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	fileupload "github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/file-upload"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type ProductService struct {
	repo         ports.ProductRepoIface
	userRepo     ports.UserRepoInterface
	businessRepo ports.BusinessIface
	categoryRepo ports.CategoryRepoIface
	dispatcher   *NotificationDispatcher
}

func NewProductService(db *gorm.DB) *ProductService {
	return &ProductService{
		repo:         mysql_repo.NewProductRepository(db),
		userRepo:     mysql_repo.NewUserRepository(db),
		businessRepo: mysql_repo.NewBusinessRepository(db),
		categoryRepo: mysql_repo.NewCategoryRepository(db),
		dispatcher:   NewNotificationDispatcher(db),
	}
}

func (s *ProductService) CreateProduct(input requests.Product, userId string) (*domain.Product, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, fmt.Errorf("invalid business")
	}

	existing, err := s.repo.GetOne(map[string]interface{}{"title": input.Title, "business_id": business.ID})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing product: %v", err)
	}
	if existing != nil {
		return nil, fmt.Errorf("a product with the same name already exists")
	}
	category, err := s.categoryRepo.FindCategoryById(input.CategoryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("category not found")
		}
		return nil, fmt.Errorf("failed to fetch category: %v", err)
	}

	if category == nil {
		return nil, fmt.Errorf("invalid category")
	}
	subCategory, err := s.categoryRepo.FindSubcategoryById(input.SubCategoryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("sub-category not found")
		}
		return nil, fmt.Errorf("failed to fetch sub-category: %v", err)
	}

	if subCategory == nil {
		return nil, fmt.Errorf("invalid sub-category")
	}

	// Both ids resolve, but that does not make them a pair. Nothing stopped a
	// client sending a valid category with a sub-category belonging to a
	// different one, and the product would then be filed under a taxonomy path
	// that does not exist — invisible to category browsing and wrong for the
	// shipping defaults read from the sub-category just below.
	if subCategory.CategoryId != category.ID {
		return nil, fmt.Errorf("sub-category does not belong to the selected category")
	}

	if input.Weight == 0 {
		input.Weight = subCategory.DefaultWeight
	}
	if input.Length == 0 {
		input.Length = subCategory.DefaultLength
	}
	if input.Width == 0 {
		input.Width = subCategory.DefaultWidth
	}
	if input.Height == 0 {
		input.Height = subCategory.DefaultHeight
	}

	var urls []string
	for _, base64Image := range input.Image {
		decodedImage, err := helper.DecodeBase64Image(base64Image)
		if err != nil {
			return nil, fmt.Errorf("something went wrong")
		}
		url, err := fileupload.UploadFileWithFallback(decodedImage)
		if err != nil {
			continue
		}
		urls = append(urls, url)
	}

	var variants []domain.Variant
	for _, v := range input.Variants {
		variant := domain.Variant{
			Name:            v.Name,
			Status:          v.Status,
			Types:           domain.StrArray(v.Types),
			OwnedProperties: domain.StrArray(v.OwnedProperties),
			PriceValues:     v.PriceValues,
			StockValues:     v.StockValues,
			ImageValues:     v.ImageValues,
		}
		variants = append(variants, variant)
	}

	product := domain.Product{
		SKU:                input.SKU,
		Barcode:            input.Barcode,
		Title:              input.Title,
		Description:        input.Description,
		Slug:               helper.GenerateSlug(input.Title),
		PublicID:           s.uniquePublicID(),
		Image:              domain.StrArray(urls),
		Stock:              input.Stock,
		Sales:              input.Sales,
		Tag:                domain.StrArray(input.Tag),
		Variants:           variants,
		IsCombination:      input.IsCombination,
		Status:             input.Status,
		CategoryID:         input.CategoryID,
		SubCategoryID:      input.SubCategoryID,
		ExternalCategoryId: category.ExternalCategoryId, // Inherit external category from parent category
		OldPrice:           input.Price.OldPrice,
		Price:              input.Price.Price,
		BusinessID:         business.ID,
		UserID:             userId,
		CollectionIDs:      domain.StrArray(input.CollectionIDs),
		Weight:             input.Weight,
		Height:             input.Height,
		Length:             input.Length,
		Width:              input.Width,
	}

	createdProduct, err := s.repo.Create(&product)
	if err != nil {
		return nil, fmt.Errorf("failed to create product: %w", err)
	}

	// Variant combinations removed - backend calculates combinations on-demand from variants

	// NS2 buyer.store.new_arrivals — tell the store's followers a new item landed.
	// Ambient + badge-silent; best-effort fan-out (see notifyFollowersNewArrival).
	s.notifyFollowersNewArrival(business, createdProduct.Title)

	return &createdProduct, nil
}

// uniquePublicID returns a fresh public id not already taken (STOREFRONT-URL-REWORK
// Rev 2). Collision at 36^10 is ~1e-15, so this pre-check almost never regenerates;
// the DB unique index on products.public_id is the ultimate backstop.
func (s *ProductService) uniquePublicID() string {
	for i := 0; i < 5; i++ {
		id := helper.GeneratePublicID()
		_, err := s.repo.GetOne(map[string]interface{}{"public_id": id})
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return id // definitively free
		}
		// err == nil → id already taken → regenerate.
		// any other (transient DB) error → don't trust it as free, regenerate too;
		// the UNIQUE index on products.public_id is the ultimate backstop at insert.
	}
	return helper.GeneratePublicID()
}

// GetProductByPublicID resolves an active product by its public id — the buyer
// product-URL resolver (/@{handle}/p/{slug}-{publicId}). The internal UUID is never
// used in public URLs.
func (s *ProductService) GetProductByPublicID(publicID string) (*domain.Product, error) {
	product, err := s.repo.GetOneWithAssociations(map[string]interface{}{"public_id": publicID})
	if err != nil {
		return nil, errors.New("product not found")
	}
	if product.Status != string(helper.ProductStatusActive) {
		return nil, errors.New("product not found")
	}
	return product, nil
}

func (s *ProductService) UpdateProduct(productId, userId string, input requests.Product) (*domain.Product, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, fmt.Errorf("invalid business")
	}

	product, err := s.repo.GetOne(map[string]interface{}{"id": productId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("product not found")
		}
		return nil, fmt.Errorf("something went wrong")
	}

	if product.BusinessID != business.ID {
		return nil, fmt.Errorf("unauthorized: invalid business owner")
	}

	category, err := s.categoryRepo.FindCategoryById(input.CategoryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("category not found")
		}
		return nil, fmt.Errorf("failed to fetch category: %v", err)
	}

	if category == nil {
		return nil, fmt.Errorf("invalid category")
	}
	subCategory, err := s.categoryRepo.FindSubcategoryById(input.SubCategoryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("sub-category not found")
		}
		return nil, fmt.Errorf("failed to fetch sub-category: %v", err)
	}

	if subCategory == nil {
		return nil, fmt.Errorf("invalid sub-category")
	}

	// Both ids resolve, but that does not make them a pair. Nothing stopped a
	// client sending a valid category with a sub-category belonging to a
	// different one, and the product would then be filed under a taxonomy path
	// that does not exist — invisible to category browsing and wrong for the
	// shipping defaults read from the sub-category just below.
	if subCategory.CategoryId != category.ID {
		return nil, fmt.Errorf("sub-category does not belong to the selected category")
	}

	if input.Weight == 0 {
		input.Weight = subCategory.DefaultWeight
	}
	if input.Length == 0 {
		input.Length = subCategory.DefaultLength
	}
	if input.Width == 0 {
		input.Width = subCategory.DefaultWidth
	}
	if input.Height == 0 {
		input.Height = subCategory.DefaultHeight
	}

	var urls []string
	for _, base64Image := range input.Image {
		decodedImage, err := helper.DecodeBase64Image(base64Image)
		if err != nil {
			continue
		}
		url, err := fileupload.UploadFileWithFallback(decodedImage)
		if err != nil {
			continue
		}
		urls = append(urls, url)
	}

	var variants []domain.Variant
	for _, v := range input.Variants {
		variants = append(variants, domain.Variant{
			Name:            v.Name,
			Status:          v.Status,
			Types:           v.Types,
			OwnedProperties: v.OwnedProperties,
			PriceValues:     v.PriceValues,
			StockValues:     v.StockValues,
			ImageValues:     v.ImageValues,
		})
	}

	updatedProduct := domain.Product{
		SKU:                input.SKU,
		Barcode:            input.Barcode,
		Title:              input.Title,
		Description:        input.Description,
		// Slug is title-derived (URL-rework): keep it in sync with the title on
		// update instead of trusting a possibly-empty/stale input.Slug. The product
		// URL resolves by id, so a changed slug is corrected by the canonical redirect.
		Slug:               helper.GenerateSlug(input.Title),
		Image:              domain.StrArray(urls),
		Stock:              input.Stock,
		Sales:              input.Sales,
		Tag:                domain.StrArray(input.Tag),
		Variants:           variants,
		IsCombination:      input.IsCombination,
		Status:             input.Status,
		CategoryID:         input.CategoryID,
		SubCategoryID:      input.SubCategoryID,
		ExternalCategoryId: category.ExternalCategoryId, // Inherit external category from parent category
		OldPrice:           input.Price.OldPrice,
		Price:              input.Price.Price,
		BusinessID:         product.BusinessID,
		UserID:             product.UserID,
		CollectionIDs:      domain.StrArray(input.CollectionIDs),
		Weight:             input.Weight,
		Height:             input.Height,
		Length:             input.Length,
		Width:              input.Width,
	}

	updatedProductResult, err := s.repo.Update(productId, updatedProduct)
	if err != nil {
		return nil, err
	}

	// NS2 wishlist producers — diff the pre-update product against the new values
	// and fan out to everyone who saved it. Both are ambient + badge-silent.
	oldStock, newStock := 0, 0
	if product.Stock != nil {
		oldStock = *product.Stock
	}
	if updatedProductResult.Stock != nil {
		newStock = *updatedProductResult.Stock
	}
	priceDropped := updatedProductResult.Price > 0 && product.Price > 0 && updatedProductResult.Price < product.Price
	backInStock := oldStock == 0 && newStock > 0
	// Crossed into the low-stock band (same < 3 threshold the seller inventory
	// nudge uses) — an urgency cue for people who saved it.
	wishlistLow := oldStock >= 3 && newStock > 0 && newStock < 3
	if priceDropped || backInStock || wishlistLow {
		s.notifyWishlisters(productId, business.Tag, updatedProductResult, priceDropped, backInStock, wishlistLow, newStock)
	}

	// Handle variant deletion when product is no longer variable
	if !input.IsCombination {
		// Delete all existing variants for this product when is_combination is false
		err = s.repo.DeleteVariantsByProductID(productId)
		if err != nil {
			// Log error but don't fail product update
			fmt.Printf("Warning: Failed to delete variants: %v\n", err)
		}
	}

	// Variant combinations removed - backend calculates combinations on-demand from variants

	return updatedProductResult, nil
}

// notifyFollowersNewArrival fans buyer.store.new_arrivals out to a store's
// followers when a new product is created. In-app + badge-silent + best-effort;
// capped so a store with a huge following can't blast an unbounded batch in one
// upload (the tail is silently skipped — acceptable for an ambient nudge).
func (s *ProductService) notifyFollowersNewArrival(business *domain.Business, title string) {
	if business == nil {
		return
	}
	followers, _, err := s.businessRepo.GetFollowers(map[string]interface{}{"business_id": business.ID}, "", 1, 1000)
	if err != nil {
		return
	}
	for _, f := range followers {
		if f.UserID == "" {
			continue
		}
		_ = s.dispatcher.Emit(context.Background(), EmitInput{
			Event:  "buyer.store.new_arrivals",
			UserID: f.UserID,
			// {{store}} = brand name (copy); {{handle}} = tag for the /@{handle} route.
			Vars:   map[string]string{"store": business.Name, "item": title, "handle": business.Tag},
		})
	}
}

// notifyWishlisters fans price-drop / back-in-stock notices out to everyone who
// saved a product, when an update crosses one of those thresholds. In-app +
// badge-silent + best-effort; capped like the new-arrivals fan-out.
func (s *ProductService) notifyWishlisters(productId, handle string, p *domain.Product, priceDrop, backInStock, lowStock bool, qty int) {
	if p == nil {
		return
	}
	saves, _, err := s.repo.GetAllProductWishlist(map[string]interface{}{"product_id": productId}, false, 1, 1000)
	if err != nil {
		return
	}
	// Deep-link vars for the canonical product URL /@{handle}/p/{slug}-{publicId}
	// (STOREFRONT-URL-REWORK §5). slug is derived from the title exactly as the
	// route's canonical is, so a tapped link resolves without a 301; publicId is the
	// stable resolver (NOT the internal UUID).
	slug, publicID := helper.GenerateSlug(p.Title), p.PublicID
	for _, w := range saves {
		if w.UserID == "" {
			continue
		}
		if priceDrop {
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.wishlist.price_drop",
				UserID: w.UserID,
				Vars:   map[string]string{"item": p.Title, "price": FormatNaira(p.Price), "handle": handle, "slug": slug, "publicId": publicID},
			})
		}
		if backInStock {
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.wishlist.back_in_stock",
				UserID: w.UserID,
				Vars:   map[string]string{"item": p.Title, "handle": handle, "slug": slug, "publicId": publicID},
			})
		}
		if lowStock {
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.wishlist.low_stock",
				UserID: w.UserID,
				Vars:   map[string]string{"item": p.Title, "qty": fmt.Sprintf("%d", qty), "handle": handle, "slug": slug, "publicId": publicID},
			})
		}
	}
}

func (s *ProductService) GetAll(param map[string]interface{}) (interface{}, error) {
	return s.repo.GetAll(param)
}

func (s *ProductService) GetAllProductsOrderedByOrders(page, limit int, search, categoryId, subCategoryId, businessId, tag string) ([]domain.Product, int64, error) {
	param := map[string]interface{}{
		"status": string(helper.ProductStatusActive),
	}
	if categoryId != "" {
		param["category_id"] = categoryId
	}
	if subCategoryId != "" {
		param["sub_category_id"] = subCategoryId
	}
	// STOREFRONT-URL-REWORK: filter a storefront to its own products (the storefront
	// resolver was previously ignored, returning all vendors' products).
	if businessId != "" {
		param["business_id"] = businessId
	}
	// P16: server-side storefront tag filter (tag is a jsonb array — the repo matches
	// products whose array contains this tag).
	if tag != "" {
		param["tag"] = tag
	}
	// Buyer-facing storefront + marketplace previews: hide out-of-stock products.
	products, totalItems, err := s.repo.GetAllPaginated(param, search, page, limit, true)
	if err != nil {
		return nil, 0, errors.New("error fetching products")
	}

	return products, totalItems, nil
}

// GetStoreTags returns a storefront's distinct product tags (for the filter chips).
func (s *ProductService) GetStoreTags(businessId string) ([]string, error) {
	return s.repo.GetDistinctTags(businessId)
}

func (s *ProductService) Find(id string) (*domain.Product, error) {
	product, err := s.repo.GetOneWithAssociations(map[string]interface{}{"id": id})
	if err != nil {
		return nil, errors.New("error fetching product")
	}
	if product.Status != string(helper.ProductStatusActive) {
		return nil, errors.New("product is not active")
	}

	// Calculate variant combinations on-demand
	if len(product.Variants) > 0 {
		combinations := s.CalculateCombinations(product)
		// Convert to legacy format if needed for compatibility
		legacyCombinations := []map[string]interface{}{}
		for _, combo := range combinations {
			legacyCombinations = append(legacyCombinations, combo)
		}
		// Note: product.VariantCombinations field may need to be updated to handle the new format
	}
	// If there's an error loading combinations, we don't fail the request
	// This ensures backward compatibility

	return product, nil
}

func (s *ProductService) AddWishlist(productId string, userId string, isGuest bool) (*domain.ProductWishlist, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}

	wishlist, err := s.repo.FindProductWishlistByFields(map[string]interface{}{"user_id": userId, "product_id": productId}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	product, err := s.repo.GetOne(map[string]interface{}{"id": productId})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if product == nil {
		return nil, fmt.Errorf("invalid product")
	}
	if wishlist != nil {
		return nil, fmt.Errorf("product already added to wishlist")
	}

	resp, err := s.repo.AddProductWishlist(&domain.ProductWishlist{
		ProductID: productId,
		UserID:    userId,
	}, isGuest)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}

	// NS2 seller.growth.wishlist_save (in-app).
	_ = s.dispatcher.EmitToBusiness(context.Background(), product.BusinessID, EmitInput{
		Event: "seller.growth.wishlist_save",
		Vars:  map[string]string{"item": product.Title, "productId": product.ID},
	})
	return resp, nil
}

func (s *ProductService) DeleteWishlist(productId string, userId string, isGuest bool) error {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return fmt.Errorf("invalid user/guest")
	}

	wishlist, err := s.repo.FindProductWishlistByFields(map[string]interface{}{"user_id": userId, "product_id": productId}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if wishlist == nil {
		if err != nil {
			return fmt.Errorf("product wishlist not found")
		}
	}

	err = s.repo.DeleteProductWishlist(wishlist.ID, isGuest)
	if err != nil {
		return fmt.Errorf("something went wrong")
	}
	return nil
}

func (s *ProductService) GetUserWishlists(userId string, isGuest bool, page, limit int) ([]domain.ProductWishlist, int64, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, 0, fmt.Errorf("invalid user/guest")
	}

	wishlist, total, err := s.repo.GetAllProductWishlist(map[string]interface{}{"user_id": userId}, isGuest, page, limit)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	return wishlist, total, nil
}

func (s *ProductService) AddRecentlyViewedProducts(request requests.RecentlyViewedProduct, userId string, isGuest bool) error {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return fmt.Errorf("invalid user/guest")
	}

	var recentlyViewedProducts []*domain.RecentlyViewedProduct
	for _, productID := range request.ProductIds {
		recentlyViewedProducts = append(recentlyViewedProducts, &domain.RecentlyViewedProduct{
			ProductID: productID,
			UserID:    userId,
		})
	}

	err = s.repo.AddRecentlyViewedProducts(recentlyViewedProducts, isGuest)
	if err != nil {
		return err
	}

	return nil
}

func (s *ProductService) GetProductsByContext(page, limit int, search, categoryId, subCategoryId, context, userId string, isGuest bool) ([]domain.Product, int64, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if user == nil && !isGuest {
		return nil, 0, fmt.Errorf("invalid user/guest")
	}

	params := map[string]interface{}{
		"status": string(helper.ProductStatusActive),
	}
	if categoryId != "" {
		params["category_id"] = categoryId
	}
	if subCategoryId != "" {
		params["sub_category_id"] = subCategoryId
	}

	return s.repo.GetAllPaginatedWithContext(userId, isGuest, params, search, context, page, limit)
}

func (s *ProductService) GetTopVendors(page, limit int) ([]domain.Business, int64, error) {
	return s.repo.GetTopVendors(page, limit)
}

// GetProductWithCombinations retrieves a product with its variant combinations
func (s *ProductService) GetProductWithCombinations(productID string) (*domain.Product, error) {
	product, err := s.repo.GetOne(map[string]interface{}{"id": productID})
	if err != nil {
		return nil, fmt.Errorf("failed to get product: %w", err)
	}

	// Calculate variant combinations on-demand
	if len(product.Variants) > 0 {
		combinations := s.CalculateCombinations(product)
		// For backward compatibility, convert to expected format
		legacyCombinations := []map[string]interface{}{}
		for _, combo := range combinations {
			legacyCombinations = append(legacyCombinations, combo)
		}
		// Note: May need to adjust response format based on API expectations
	}

	return product, nil
}

// UpdateVariantCombinations removed - combinations are now calculated on-demand from variants

// GetProductCombinations retrieves all combinations for a product
func (s *ProductService) GetProductCombinations(productID string) ([]map[string]interface{}, error) {
	product, err := s.repo.GetOne(map[string]interface{}{"id": productID})
	if err != nil {
		return nil, fmt.Errorf("failed to get product: %w", err)
	}

	// Calculate combinations on-demand
	return s.CalculateCombinations(product), nil
}

// CalculateCombinations generates all variant combinations on-demand (no database storage)
// This replaces the need for pre-storing combinations in the database
func (s *ProductService) CalculateCombinations(product *domain.Product) []map[string]interface{} {
	if len(product.Variants) == 0 {
		return []map[string]interface{}{}
	}

	// Generate all possible combinations
	combinations := s.generateCombinationMatrix(product.Variants)
	results := []map[string]interface{}{}

	for _, combo := range combinations {
		calculated := map[string]interface{}{
			"combination_key": combo["key"],
			"values":          combo["values"],
			"price":           s.calculatePrice(product, combo),
			"stock":           s.calculateStock(product, combo),
			"images":          s.calculateImages(product, combo),
			"status":          s.calculateStatus(product, combo),
		}
		results = append(results, calculated)
	}

	return results
}

// generateCombinationMatrix creates cartesian product of all variant values
func (s *ProductService) generateCombinationMatrix(variants []domain.Variant) []map[string]interface{} {
	if len(variants) == 0 {
		return []map[string]interface{}{}
	}

	// Helper function for recursive combination generation
	var generate func(int, []string) [][]string
	generate = func(index int, current []string) [][]string {
		if index >= len(variants) {
			result := make([]string, len(current))
			copy(result, current)
			return [][]string{result}
		}

		var results [][]string
		for _, value := range variants[index].Types {
			newCurrent := append(current, string(value))
			results = append(results, generate(index+1, newCurrent)...)
		}
		return results
	}

	combinations := generate(0, []string{})
	results := []map[string]interface{}{}

	for _, combo := range combinations {
		key := ""
		for i, val := range combo {
			if i > 0 {
				key += "-"
			}
			key += val
		}
		results = append(results, map[string]interface{}{
			"key":    key,
			"values": combo,
		})
	}

	return results
}

// calculatePrice calculates the price for a specific combination
func (s *ProductService) calculatePrice(product *domain.Product, combo map[string]interface{}) float64 {
	basePrice := product.Price
	values := combo["values"].([]string)

	// Apply price adjustments from variants that own pricing
	for i, variant := range product.Variants {
		if i < len(values) && s.variantOwnsProperty(variant, "price") {
			value := values[i]
			if adjustment, exists := variant.PriceValues[value]; exists {
				basePrice += float64(adjustment)
			}
		}
	}

	return basePrice
}

// calculateStock determines stock for a specific combination
func (s *ProductService) calculateStock(product *domain.Product, combo map[string]interface{}) int {
	values := combo["values"].([]string)

	// Find which variant owns stock
	for i, variant := range product.Variants {
		if i < len(values) && s.variantOwnsProperty(variant, "stock") {
			value := values[i]
			if stock, exists := variant.StockValues[value]; exists {
				return stock
			}
		}
	}

	// Fall back to base stock
	if product.Stock != nil {
		return *product.Stock
	}
	return 0
}

// calculateImages determines images for a specific combination
func (s *ProductService) calculateImages(product *domain.Product, combo map[string]interface{}) []string {
	values := combo["values"].([]string)

	// Find which variant owns images
	for i, variant := range product.Variants {
		if i < len(values) && s.variantOwnsProperty(variant, "image") {
			value := values[i]
			if imageURL, exists := variant.ImageValues[value]; exists {
				return []string{imageURL}
			}
		}
	}

	// Fall back to base images
	return product.Image
}

// calculateStatus determines if a combination is available
func (s *ProductService) calculateStatus(product *domain.Product, combo map[string]interface{}) string {
	stock := s.calculateStock(product, combo)
	if stock > 0 {
		return "active"
	}
	return "out_of_stock"
}

// variantOwnsProperty checks if a variant owns a specific property type
func (s *ProductService) variantOwnsProperty(variant domain.Variant, property string) bool {
	for _, prop := range variant.OwnedProperties {
		if string(prop) == property {
			return true
		}
	}
	return false
}
