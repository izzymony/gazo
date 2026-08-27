package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	fileupload "github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/file-upload"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type BusinessService struct {
	businessRepo                     ports.BusinessIface
	userRepo                         ports.UserRepoInterface
	orderRepo                        ports.OrderRepoInterface
	shippingRepo                     ports.ShippingInterface
	productRepo                      ports.ProductRepoIface
	discountRepo                     ports.DiscountInterface
	notificationService              *NotificationService
	transactionalNotificationService *TransactionalNotificationService
	shippingService                  *ShippingService
	productService                   *ProductService
	walletService                    *WalletService
	dispatcher                       *NotificationDispatcher
}

func NewBusinessService(db *gorm.DB) *BusinessService {
	return &BusinessService{
		businessRepo:                     mysql_repo.NewBusinessRepository(db),
		userRepo:                         mysql_repo.NewUserRepository(db),
		orderRepo:                        mysql_repo.NewOrderRepository(db),
		shippingRepo:                     mysql_repo.NewShippingRepository(db),
		productRepo:                      mysql_repo.NewProductRepository(db),
		discountRepo:                     mysql_repo.NewDiscountRepository(db),
		notificationService:              NewNotificationService(db),
		transactionalNotificationService: NewTransactionalNotificationService(db),
		shippingService:                  NewShippingService(db),
		productService:                   NewProductService(db),
		walletService:                    NewWalletService(db),
		dispatcher:                       NewNotificationDispatcher(db),
	}
}

func (s *BusinessService) CreateBusiness(input requests.Business) (interface{}, error) {
	_, exist, err := s.businessRepo.GetOneWithExistence(map[string]interface{}{"name": input.Name})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing business: %v", err)
	}
	if exist {
		return nil, fmt.Errorf("a business with the name '%s' already exists", input.Name)
	}

	_, exist, err = s.businessRepo.GetOneWithExistence(map[string]interface{}{"email": input.Email})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing business: %v", err)
	}
	if exist {
		return nil, fmt.Errorf("a business with the same email already exists")
	}

	business := domain.Business{}
	err = helper.Copy(input, &business)
	if err != nil {
		logger.Error(err)
		return nil, fmt.Errorf("something went wrong")
	}

	// STOREFRONT-URL-REWORK: the store tag is the public URL identity — validate +
	// normalize it on create (format / reserved / global-uniqueness), the same
	// server-authoritative check the update path enforces. The request only marks
	// tag `required`, so without this a new store could claim a reserved/invalid tag.
	normalizedTag := strings.ToLower(strings.TrimSpace(input.Tag))
	if err := s.ValidateTag(normalizedTag, ""); err != nil {
		return nil, err
	}
	business.Tag = normalizedTag

	// Validate business address with Shipbubble and get address code
	if input.Address != nil {
		// Fetch business owner's name for Shipbubble validation
		user, err := s.userRepo.GetOne(map[string]interface{}{"id": input.UserID}, false)
		if err != nil {
			logger.Error("Failed to fetch user for address validation: " + err.Error())
			return nil, fmt.Errorf("failed to fetch user information")
		}

		formattedAddress := fmt.Sprintf("%s, %s", input.Address.AddressLine, input.Address.Country)
		if input.Address.Area != nil && *input.Address.Area != "" {
			formattedAddress = fmt.Sprintf("%s, %s, %s", input.Address.AddressLine, *input.Address.Area, input.Address.Country)
		}

		// Use owner's name (not business name) for Shipbubble validation
		addressCode, err := s.shippingService.ValidateBusinessAddress(
			user.Firstname,
			user.Lastname,
			input.Email,
			input.Phone,
			formattedAddress,
		)
		if err != nil {
			logger.Error("Business address validation failed: " + err.Error())
			// Continue with business creation but log the error - don't block business creation
			fmt.Printf("⚠️  WARNING: Business created without Shipbubble address validation: %v\n", err)
		} else {
			// Set the validated address code in the business address
			if business.Address != nil {
				business.Address.ShipbubbleAddressCode = addressCode
				fmt.Printf("✅ Business address validated with owner name: %s %s. Address code: %d\n", user.Firstname, user.Lastname, addressCode)
			}
		}
	}

	created, err := s.businessRepo.Create(&business)
	if err != nil {
		return created, err
	}
	// NS2 seller.onboarding.store_created (in-app).
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.onboarding.store_created",
		UserID: input.UserID,
	})
	return created, nil
}

func (s *BusinessService) UpdateBusiness(id, userId string, input domain.Business) (interface{}, error) {
	_, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}

	// Get current business to compare name
	currentBusiness, err := s.businessRepo.GetOne(map[string]interface{}{"id": id})
	if err != nil {
		return nil, fmt.Errorf("business not found: %v", err)
	}

	// Store tag is the public URL identity (STOREFRONT-URL-REWORK): validate it on
	// first assignment, and treat it as IMMUTABLE in v1 — reject a change once a tag
	// exists, since a public-identity change would break every shared /store/{tag}
	// link. Server-authoritative — the seller UI cannot be trusted to enforce this.
	incomingTag := strings.ToLower(strings.TrimSpace(input.Tag))
	currentTag := strings.ToLower(strings.TrimSpace(currentBusiness.Tag))
	switch {
	case incomingTag == "":
		// Form omitted/blanked the tag — never wipe the existing identity.
		input.Tag = currentBusiness.Tag
	case currentTag == "":
		// First-time tag assignment — enforce format / reserved / uniqueness.
		if err := s.ValidateTag(incomingTag, id); err != nil {
			return nil, err
		}
		input.Tag = incomingTag
	case incomingTag != currentTag:
		return nil, fmt.Errorf("store tag cannot be changed")
	default:
		input.Tag = currentTag
	}

	// Only check for duplicate name if the name is actually changing
	if currentBusiness.Name != input.Name {
		fmt.Printf("🔍 DEBUG: Name is changing from '%s' to '%s'\n", currentBusiness.Name, input.Name)

		existing, exists, err := s.businessRepo.GetOneWithExistence(map[string]interface{}{"name": input.Name})
		if err != nil {
			return nil, fmt.Errorf("failed to check existing business: %v", err)
		}

		if exists && existing.ID != id {
			fmt.Printf("🔍 DEBUG: Found existing business with name '%s' (ID: %s), Current ID: %s\n", input.Name, existing.ID, id)
			return nil, fmt.Errorf("a different business with the name '%s' already exists", input.Name)
		}

		fmt.Printf("🔍 DEBUG: No existing business found with name '%s', proceeding with update\n", input.Name)
	} else {
		fmt.Printf("🔍 DEBUG: Name not changing (still '%s'), skipping duplicate check\n", currentBusiness.Name)
	}

	// Validate business address with Shipbubble if address is provided
	if input.Address != nil {
		// Fetch business owner's name for Shipbubble validation
		user, err := s.userRepo.GetOne(map[string]interface{}{"id": userId}, false)
		if err != nil {
			logger.Error("Failed to fetch user for address validation: " + err.Error())
			return nil, fmt.Errorf("failed to fetch user information")
		}

		formattedAddress := fmt.Sprintf("%s, %s", input.Address.AddressLine, input.Address.Country)
		if input.Address.Area != nil && *input.Address.Area != "" {
			formattedAddress = fmt.Sprintf("%s, %s, %s", input.Address.AddressLine, *input.Address.Area, input.Address.Country)
		}

		// Use owner's name (not business name) for Shipbubble validation
		addressCode, err := s.shippingService.ValidateBusinessAddress(
			user.Firstname,
			user.Lastname,
			input.Email,
			input.Phone,
			formattedAddress,
		)
		if err != nil {
			logger.Error("Business address validation failed during update: " + err.Error())
			// Continue with business update but log the error
			fmt.Printf("⚠️  WARNING: Business updated without Shipbubble address validation: %v\n", err)
		} else {
			// Set the validated address code
			input.Address.ShipbubbleAddressCode = addressCode
			fmt.Printf("✅ Business address updated and validated with owner name: %s %s. Address code: %d\n", user.Firstname, user.Lastname, addressCode)
		}
	}

	return s.businessRepo.Update(id, input)
}

// GetAllBusinesses Ordered by orders
func (s *BusinessService) GetAllBusinesses(search string, page, limit int) ([]domain.Business, int64, error) {
	businesses, totalItems, err := s.businessRepo.GetAllPaginated(search, "", page, limit)
	if err != nil {
		return nil, 0, errors.New("error fetching businesses")
	}
	for i, _ := range businesses {
		businesses[i].Email = ""
		// Keep address for marketplace display (location is shown publicly)
		// businesses[i].Address = nil
		businesses[i].BankAccountDetails = nil

		// Keep only theme-related settings for public display, remove sensitive settings
		if businesses[i].BusinessSetting != nil {
			// Create a new BusinessSetting with only theme data
			themeOnlySetting := &domain.BusinessSetting{
				Model: domain.Model{
					ID:        businesses[i].BusinessSetting.ID,
					CreatedAt: businesses[i].BusinessSetting.CreatedAt,
					UpdatedAt: businesses[i].BusinessSetting.UpdatedAt,
				},
				BusinessID:           businesses[i].BusinessSetting.BusinessID,
				PersonalisedSettings: businesses[i].BusinessSetting.PersonalisedSettings,
			}
			businesses[i].BusinessSetting = themeOnlySetting
		}
	}
	return businesses, totalItems, nil
}

// GetShopVendors returns the public marketplace vendor list — same ranking / has-products
// guard / public field-stripping as GetAllBusinesses, plus an optional category filter —
// for the /shop/vendors discovery feed (P16).
func (s *BusinessService) GetShopVendors(search, category string, page, limit int) ([]domain.Business, int64, error) {
	businesses, totalItems, err := s.businessRepo.GetAllPaginated(search, category, page, limit)
	if err != nil {
		return nil, 0, errors.New("error fetching vendors")
	}
	for i := range businesses {
		businesses[i].Email = ""
		businesses[i].BankAccountDetails = nil
		if businesses[i].BusinessSetting != nil {
			// Strip to theme-only for public display (drop sensitive settings).
			businesses[i].BusinessSetting = &domain.BusinessSetting{
				Model:                businesses[i].BusinessSetting.Model,
				BusinessID:           businesses[i].BusinessSetting.BusinessID,
				PersonalisedSettings: businesses[i].BusinessSetting.PersonalisedSettings,
			}
		}
	}
	return businesses, totalItems, nil
}

func (s *BusinessService) GetAuthenticatedUserBusiness(userId string) (*domain.Business, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("business not found for user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	// Return full business details for authenticated owner (don't strip email, address, etc.)
	return business, nil
}

func (s *BusinessService) GetBusiness(id string) (*domain.Business, error) {
	b, err := s.businessRepo.Find(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	return publicBusinessView(b), nil
}

// GetBusinessByTag resolves a public storefront by its tag (STOREFRONT-URL-REWORK)
// — one indexed lookup, the same owner-only stripping as GetBusiness. Replaces the
// old name-search / 500-row-pull vendor resolution.
func (s *BusinessService) GetBusinessByTag(tag string) (*domain.Business, error) {
	b, err := s.businessRepo.FindByTag(strings.TrimSpace(tag))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("store not found")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	return publicBusinessView(b), nil
}

// publicBusinessView strips owner-only fields from a business for public display.
// Shared by GetBusiness and GetBusinessByTag so both surfaces mask identically —
// a new sensitive field only has to be masked here once.
func publicBusinessView(b domain.Business) *domain.Business {
	b.Email = ""
	b.Address = nil
	b.BankAccountDetails = nil

	// Keep only theme-related settings for public display, remove sensitive settings.
	if b.BusinessSetting != nil {
		b.BusinessSetting = &domain.BusinessSetting{
			Model: domain.Model{
				ID:        b.BusinessSetting.ID,
				CreatedAt: b.BusinessSetting.CreatedAt,
				UpdatedAt: b.BusinessSetting.UpdatedAt,
			},
			BusinessID:           b.BusinessSetting.BusinessID,
			PersonalisedSettings: b.BusinessSetting.PersonalisedSettings,
		}
	}
	return &b
}

// reservedTags may not be claimed as a store tag (STOREFRONT-URL-REWORK §5) — they
// collide with app/marketing routes or the /store & /shop namespaces.
var reservedTags = map[string]bool{
	"api": true, "auth": true, "admin": true, "seller": true, "store": true,
	"shop": true, "p": true, "products": true, "cart": true, "checkout": true,
	"orders": true, "account": true, "profile": true, "dashboard": true,
	"signin": true, "signup": true, "welcome": true, "notifications": true,
	"inbox": true, "messages": true, "wallet": true, "payout": true,
	"withdraw": true, "settings": true, "legal": true, "privacy": true,
	"terms": true, "new": true, "recently-viewed": true, "spotlights": true,
	"static": true, "assets": true,
}

var tagFormatRe = regexp.MustCompile(`^[a-z0-9-]+$`)

// ValidateTag enforces the store-tag rules (STOREFRONT-URL-REWORK §7): lowercase
// [a-z0-9-], 3–30 chars, not reserved, globally unique. excludeID lets a seller
// re-validate their own store's current tag without matching themselves.
func (s *BusinessService) ValidateTag(tag string, excludeID string) error {
	tag = strings.ToLower(strings.TrimSpace(tag))
	if len(tag) < 3 || len(tag) > 30 {
		return fmt.Errorf("tag must be between 3 and 30 characters")
	}
	if !tagFormatRe.MatchString(tag) {
		return fmt.Errorf("tag may only contain lowercase letters, numbers, and hyphens")
	}
	if reservedTags[tag] {
		return fmt.Errorf("tag is reserved")
	}
	count, err := s.businessRepo.CountByTag(tag, excludeID)
	if err != nil {
		return fmt.Errorf("something went wrong")
	}
	if count > 0 {
		return fmt.Errorf("tag is already taken")
	}
	return nil
}

func (s *BusinessService) BusinessMetric(id string) (interface{}, error) {
	return s.businessRepo.Metric(id)
}

func (s *BusinessService) GetBackgroundSettings(businessID string) (domain.PersonalisedSettings, error) {
	return s.businessRepo.GetBackgroundSettings(businessID)
}

func (s *BusinessService) UpdateBackgroundColor(businessID string, color string, pattern string) error {
	return s.businessRepo.UpdateBackgroundColor(businessID, color, pattern)
}

func (s *BusinessService) UpdateShippingSettings(businessID, userId string, partnerEnabled bool, selfZones domain.SelfZones) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": businessID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("business not found")
		}
		return fmt.Errorf("something went wrong")
	}
	// Ownership check — only the store's owner may change its shipping config.
	if business.UserID != userId {
		return fmt.Errorf("not authorized to update this store")
	}
	// Local is the always-on coverage guarantee (there is always ≥1 delivery
	// method), enforced server-side regardless of what the client sends.
	selfZones.Local.Enabled = true
	return s.businessRepo.UpdateShippingSettings(businessID, partnerEnabled, selfZones)
}

func (s *BusinessService) UploadBackgroundImage(businessID string, file io.Reader) (string, error) {
	fileURL, err := fileupload.UploadFileWithFallback(file)
	if err != nil {
		return "", err
	}

	err = s.businessRepo.UpdateBackgroundImage(businessID, fileURL)
	if err != nil {
		return "", err
	}

	return fileURL, nil
}

func (s *BusinessService) DeleteBackgroundImage(businessID string) error {
	return s.businessRepo.DeleteBackgroundImage(businessID)
}

func (s *BusinessService) AddRecentlyViewedBusinesses(request requests.RecentlyViewedBusiness, userId string, isGuest bool) error {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return fmt.Errorf("invalid user/guest")
	}

	var recentlyViewedBusinesses []*domain.RecentlyViewedBusiness
	for _, businessID := range request.BusinessIds {
		recentlyViewedBusinesses = append(recentlyViewedBusinesses, &domain.RecentlyViewedBusiness{
			BusinessID: businessID,
			UserID:     userId,
		})
	}

	err = s.businessRepo.AddRecentlyViewedBusinesses(recentlyViewedBusinesses, isGuest)
	if err != nil {
		return err
	}

	return nil
}

func (s *BusinessService) GetUserRecentlyViewedBusinesses(userId string, isGuest bool, page, limit int) ([]domain.RecentlyViewedBusiness, int64, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, 0, fmt.Errorf("invalid user/guest")
	}

	resp, total, err := s.businessRepo.GetAllRecentlyViewedBusinesses(map[string]interface{}{"user_id": userId}, isGuest, page, limit)
	if err != nil {
		return nil, 0, err
	}

	for i, _ := range resp {
		resp[i].Business.Email = ""
		resp[i].Business.Address = nil
		resp[i].Business.BankAccountDetails = nil

		// Keep only theme-related settings for public display, remove sensitive settings
		if resp[i].Business.BusinessSetting != nil {
			// Create a new BusinessSetting with only theme data
			themeOnlySetting := &domain.BusinessSetting{
				Model: domain.Model{
					ID:        resp[i].Business.BusinessSetting.ID,
					CreatedAt: resp[i].Business.BusinessSetting.CreatedAt,
					UpdatedAt: resp[i].Business.BusinessSetting.UpdatedAt,
				},
				BusinessID:           resp[i].Business.BusinessSetting.BusinessID,
				PersonalisedSettings: resp[i].Business.BusinessSetting.PersonalisedSettings,
			}
			resp[i].Business.BusinessSetting = themeOnlySetting
		}
	}

	return resp, total, nil
}

func (s *BusinessService) GetOrders(userId string, page, limit int) ([]domain.OrderItem, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	orders, total, err := s.orderRepo.GetAllOrderItemsPaginated(map[string]interface{}{"business_id": business.ID}, false, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("error fetching orders")
	}
	for i := range orders {
		orders[i].BuyerActivity = nil
	}
	return orders, total, nil
}

func (s *BusinessService) GetOrder(id, userId string) (*domain.OrderItem, error) {
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
	order, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{
		"business_id": business.ID,
		"id":          id,
	}, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if order == nil {
		return nil, fmt.Errorf("invalid order")
	}
	order.BuyerActivity = nil

	return order, nil
}

func (s *BusinessService) MarkOrderReady(id, userId string) (*domain.OrderItem, error) {
	fmt.Printf("DEBUG: MarkOrderReady called with id=%s, userId=%s\n", id, userId)

	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		fmt.Printf("DEBUG: Error getting business: %v\n", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")

	}
	if business == nil {
		fmt.Printf("DEBUG: Business is nil\n")
		return nil, fmt.Errorf("invalid business")
	}

	fmt.Printf("DEBUG: Found business with ID=%s for user=%s\n", business.ID, userId)

	queryParams := map[string]interface{}{
		"business_id": business.ID,
		"id":          id,
	}
	fmt.Printf("DEBUG: Querying order item with params: %+v\n", queryParams)

	existing, err := s.orderRepo.GetOneOrderItem(queryParams, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		fmt.Printf("DEBUG: Error getting order item: %v\n", err)
		return nil, fmt.Errorf("something went wrong")
	}
	if existing == nil {
		fmt.Printf("DEBUG: Order item not found with id=%s and business_id=%s\n", id, business.ID)
		fmt.Printf("DEBUG: This means either the order item ID doesn't exist, or it doesn't belong to this business\n")
		return nil, fmt.Errorf("invalid order")
	}

	fmt.Printf("DEBUG: Found order item with ID=%s\n", existing.ID)
	if existing.ShipmentID != "" {
		return nil, fmt.Errorf("order already marked as ready")
	}

	// Payment gate: never book a real (billable) courier label for an order that
	// has not been paid for. Interim guard — goes moot once order-on-success ships.
	paidOrder, err := s.orderRepo.GetOneOrder(map[string]interface{}{
		"id": existing.OrderID,
	}, false)
	if err != nil || paidOrder == nil {
		return nil, errors.New("order not found")
	}
	if !paidOrder.PaymentReceived {
		return nil, fmt.Errorf("order has not been paid for")
	}

	updatedOrder, err := s.orderRepo.UpdateOrderItem(id, *existing, false)
	if err != nil {
		return nil, fmt.Errorf("failed to update item")
	}

	// create shipment
	err = s.shippingService.CreateShipment(existing.ID, false)
	if err != nil {
		fmt.Printf("DEBUG: CreateShipment failed with error: %v\n", err)
		return nil, fmt.Errorf("failed to create shipment: %v", err)
	}

	order, err := s.orderRepo.GetOneOrder(map[string]interface{}{
		"id": existing.OrderID,
	}, false)
	if err != nil || order == nil {
		return nil, errors.New("order not found")
	}

	for _, item := range order.Items {

		// NS2 buyer.item.preparing — FIX: this was mis-targeted to the seller
		// (userId). The "order ready / preparing" update belongs to the BUYER
		// (order.UserID). The transactional shipping notification below already
		// (correctly) goes to the buyer.
		prod, _ := s.productRepo.GetOne(map[string]interface{}{"id": item.ProductID})
		itemName := ""
		if prod != nil {
			itemName = prod.Title
		}
		_ = s.dispatcher.Emit(context.Background(), EmitInput{
			Event:  "buyer.item.preparing",
			UserID: order.UserID,
			Vars:   map[string]string{"item": itemName, "store": business.Name, "itemId": item.ID},
		})

		// Send transactional shipping notification to buyer (WhatsApp -> Email -> SMS)
		s.sendShippingNotification(order, item, business)
	}

	return updatedOrder, nil
}

// locateSellerOrderItem finds an order item owned by the given business across
// both the authed and guest order tables, returning whether it belongs to a
// guest checkout. A Self-delivery order can live in either table, so every step
// of the seller lifecycle threads the resolved isGuest through.
func (s *BusinessService) locateSellerOrderItem(businessID, itemID string) (*domain.OrderItem, bool, error) {
	for _, isGuest := range []bool{false, true} {
		item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{
			"business_id": businessID,
			"id":          itemID,
		}, isGuest)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, false, fmt.Errorf("something went wrong")
		}
		if item != nil {
			return item, isGuest, nil
		}
	}
	return nil, false, fmt.Errorf("invalid order")
}

// requireSelfDelivery loads the item's selected shipping option and confirms it
// is a Self-delivery order, returning the option so its zone/rate/ETA can be
// carried onto the shipment. The seller lifecycle endpoints must never touch a
// courier order — those are advanced solely by the Shipbubble webhook.
func (s *BusinessService) requireSelfDelivery(item *domain.OrderItem, isGuest bool) (*domain.ShippingOption, error) {
	opt, err := s.shippingRepo.GetOneShippingRate(map[string]interface{}{"id": item.ShippingOptionID}, isGuest)
	if err != nil || opt == nil {
		return nil, fmt.Errorf("shipping option not found")
	}
	if opt.Provider != "self" {
		return nil, fmt.Errorf("this order is delivered by a courier partner")
	}
	return opt, nil
}

// MarkSelfOutForDelivery is step one of the seller-driven Self-delivery
// lifecycle: the seller records a dispatch contact and marks the order out for
// delivery. It attaches the dispatch details to the self shipment's
// provider_data (creating the shipment if MarkOrderReady hasn't already), moves
// the item to "shipped", logs the activity for both parties, and notifies the
// buyer. No money moves here — funds are released at MarkSelfDelivered.
func (s *BusinessService) MarkSelfOutForDelivery(id, userId, dispatchName, dispatchPhone, dispatchNote string) (*domain.OrderItem, error) {
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

	item, isGuest, err := s.locateSellerOrderItem(business.ID, id)
	if err != nil {
		return nil, err
	}

	// Payment gate — never advance an unpaid order.
	order, err := s.orderRepo.GetOneOrder(map[string]interface{}{"id": item.OrderID}, isGuest)
	if err != nil || order == nil {
		return nil, errors.New("order not found")
	}
	if !order.PaymentReceived {
		return nil, fmt.Errorf("order has not been paid for")
	}

	// Self-only guard.
	opt, err := s.requireSelfDelivery(item, isGuest)
	if err != nil {
		return nil, err
	}

	// Merge the dispatch contact onto a fresh copy of the self option's
	// provider_data (preserves zone/rate/delivery_eta) and persist it on the
	// shipment.
	pd := domain.MapArray{{}}
	if len(opt.ProviderData) > 0 {
		for k, v := range opt.ProviderData[0] {
			pd[0][k] = v
		}
	}
	pd[0]["dispatch_name"] = dispatchName
	pd[0]["dispatch_phone"] = dispatchPhone
	pd[0]["dispatch_note"] = dispatchNote

	if item.ShipmentID == "" {
		shipment, err := s.shippingRepo.CreateShipment(&domain.Shipment{
			Provider:     "self",
			OrderID:      item.OrderID,
			ProviderData: pd,
		}, isGuest)
		if err != nil {
			return nil, fmt.Errorf("failed to create shipment")
		}
		item.ShipmentID = shipment.ID
	} else if err := s.shippingRepo.UpdateShipmentProviderData(item.ShipmentID, pd); err != nil {
		return nil, fmt.Errorf("failed to update shipment")
	}

	// If the item is ALREADY out for delivery, this is an edit — the dispatch
	// contact was updated on the shipment above; don't advance the status again,
	// re-append the "Out for delivery" activity, or re-notify the buyer.
	alreadyOut := item.Status == string(helper.OrderStatusShipped)

	item.Status = string(helper.OrderStatusShipped)
	item.StatusUpdatedAt = time.Now()
	updated, err := s.orderRepo.UpdateOrderItem(item.ID, *item, isGuest)
	if err != nil {
		return nil, fmt.Errorf("failed to update order")
	}

	if !alreadyOut {
		details := "Your order is out for delivery."
		if dispatchPhone != "" {
			details = fmt.Sprintf("Out for delivery. Dispatch rider: %s (%s).", dispatchName, dispatchPhone)
		}
		now := time.Now().String()
		for _, at := range []string{"buyer", "seller"} {
			if _, err := s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
				Title:    string(helper.OrderActivityOutForDelivery),
				Subtitle: string(helper.OrderActivityOutForDelivery),
				Details:  details,
				Time:     now,
			}, at, isGuest); err != nil {
				return nil, fmt.Errorf("something went wrong")
			}
		}

		// Guest checkouts have no account to notify.
		if order.UserID != "" {
			prod, _ := s.productRepo.GetOne(map[string]interface{}{"id": item.ProductID})
			itemName := ""
			if prod != nil {
				itemName = prod.Title
			}
			// NS2 buyer.item.shipped (self-delivery out for delivery). In-app.
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.item.shipped",
				UserID: order.UserID,
				Vars:   map[string]string{"item": itemName, "itemId": item.ID},
			})
		}
	}

	return updated, nil
}

// MarkSelfDelivered is step two of the Self-delivery lifecycle: the seller
// confirms the buyer received the order. This is the money hook — it mirrors the
// courier webhook "completed" branch exactly, moving the item's funds from
// orders_in_progress into the clearing balance, from where the existing
// WalletCron releases them to available after the 24h window. The delivered
// transition is claimed atomically so a double tap can never credit twice.
func (s *BusinessService) MarkSelfDelivered(id, userId string) (*domain.OrderItem, error) {
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

	item, isGuest, err := s.locateSellerOrderItem(business.ID, id)
	if err != nil {
		return nil, err
	}

	// Self-only guard — courier deliveries are confirmed by the webhook.
	if _, err := s.requireSelfDelivery(item, isGuest); err != nil {
		return nil, err
	}

	// Already delivered → idempotent no-op (also covers a repeat tap).
	if item.Status == string(helper.OrderStatusDelivered) {
		return item, nil
	}
	// Must be out for delivery first.
	if item.Status != string(helper.OrderStatusShipped) {
		return nil, fmt.Errorf("mark the order out for delivery first")
	}

	// Atomically claim the delivered transition; only the winner moves money.
	claimed, err := s.orderRepo.ClaimOrderItemDelivered(item.ID, isGuest)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}
	if !claimed {
		return item, nil // lost the race — another call already delivered it
	}

	// Money move (orders_in_progress -> clearing). If it fails, roll the status
	// back to "shipped" so a retry can re-claim — funds are never stranded as
	// delivered without a matching clearing move.
	if err := s.walletService.MoveToClearingFromOrders(item, float64(item.Quantity)*item.Price, isGuest); err != nil {
		_, _ = s.orderRepo.UpdateOrderItemStatus(item.ID, string(helper.OrderStatusShipped), item.StatusUpdatedAt, isGuest)
		return nil, fmt.Errorf("failed to release funds")
	}

	now := time.Now().String()
	for _, at := range []string{"buyer", "seller"} {
		if _, err := s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
			Title:    string(helper.OrderActivityDelivered),
			Subtitle: string(helper.OrderActivityDelivered),
			Details:  "Your order has been delivered.",
			Time:     now,
		}, at, isGuest); err != nil {
			return nil, fmt.Errorf("something went wrong")
		}
	}

	order, err := s.orderRepo.GetOneOrder(map[string]interface{}{"id": item.OrderID}, isGuest)
	if err == nil && order != nil {
		prod, _ := s.productRepo.GetOne(map[string]interface{}{"id": item.ProductID})
		itemName := ""
		if prod != nil {
			itemName = prod.Title
		}
		// NS2 seller.sale.delivered (in-app) — funds now clear over the 24h window.
		_ = s.dispatcher.EmitToBusiness(context.Background(), item.BusinessID, EmitInput{
			Event: "seller.sale.delivered",
			Vars:  map[string]string{"item": itemName, "itemId": item.ID},
		})
		// NS2 buyer.item.delivered (in-app). Only the notification is re-pointed;
		// the MoveToClearingFromOrders money move above is untouched.
		if order.UserID != "" {
			_ = s.dispatcher.Emit(context.Background(), EmitInput{
				Event:  "buyer.item.delivered",
				UserID: order.UserID,
				Vars:   map[string]string{"item": itemName, "itemId": item.ID},
			})
		}
	}

	item.Status = string(helper.OrderStatusDelivered)
	return item, nil
}

// sendShippingNotification sends transactional notification when order is ready for shipping
func (s *BusinessService) sendShippingNotification(order *domain.Order, item domain.OrderItem, business *domain.Business) {
	if s.transactionalNotificationService == nil || !s.transactionalNotificationService.IsEnabled() {
		return
	}

	// Get buyer info
	buyer, err := s.userRepo.GetOne(map[string]interface{}{"id": order.UserID}, false)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to get buyer for shipping notification: %v", err))
		return
	}

	buyerPhone := ""
	buyerEmail := ""
	if buyer != nil {
		buyerPhone = buyer.Phone
		buyerEmail = buyer.Email
	}

	if buyerPhone == "" && buyerEmail == "" {
		return
	}

	trackingURL := fmt.Sprintf("https://vibaar.com/orders/%s", item.ID)
	deliveryDate := time.Now().AddDate(0, 0, 3).Format("January 2, 2006") // Estimated 3 days

	// Send async to not block the main flow
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error(fmt.Sprintf("recovered panic in SendShippingUpdate goroutine: %v", r))
			}
		}()
		ctx := context.Background()
		err := s.transactionalNotificationService.SendShippingUpdate(
			ctx,
			order.ID,
			order.UserID,
			buyerPhone,
			buyerEmail,
			trackingURL,
			deliveryDate,
		)
		if err != nil {
			logger.Error(fmt.Sprintf("Failed to send shipping notification: %v", err))
		}
	}()
}

func (s *BusinessService) CancelOrder(id, userId string) (*domain.OrderItem, error) {
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
	existing, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{
		"business_id": business.ID,
		"id":          id,
	}, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if existing == nil {
		return nil, fmt.Errorf("invalid order")
	}
	_, err = s.orderRepo.AppendActivity(existing.ID, domain.OrderActivity{
		Title:    string(helper.OrderActivityCancelled),
		Subtitle: string(helper.OrderActivityCancelled),
		Details:  "Your order has been canceled.",
		Time:     time.Now().String(),
	}, "buyer", false)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}
	_, err = s.orderRepo.AppendActivity(existing.ID, domain.OrderActivity{
		Title:    string(helper.OrderActivityCancelled),
		Subtitle: string(helper.OrderActivityCancelled),
		Details:  "Your order has been canceled.",
		Time:     time.Now().String(),
	}, "seller", false)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}

	// NS2 buyer.item.cancelled — the seller cancelled this item; notify the buyer.
	if order, oErr := s.orderRepo.GetOneOrder(map[string]interface{}{"id": existing.OrderID}, false); oErr == nil && order != nil && order.UserID != "" {
		prod, _ := s.productRepo.GetOne(map[string]interface{}{"id": existing.ProductID})
		itemName := ""
		if prod != nil {
			itemName = prod.Title
		}
		_ = s.dispatcher.Emit(context.Background(), EmitInput{
			Event:  "buyer.item.cancelled",
			UserID: order.UserID,
			Vars:   map[string]string{"item": itemName, "itemId": existing.ID},
		})
	}

	updated, err := s.orderRepo.UpdateOrderItem(id, *existing, false)
	if err != nil {
		return nil, fmt.Errorf("failed to update order")
	}

	return updated, nil
}

func (s *BusinessService) GetCustomers(userId, search string, page, limit int) ([]domain.Customer, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	customers, total, err := s.businessRepo.GetCustomers(business.ID, search, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	for i := range customers {
		shippingProfile, err := s.shippingRepo.GetMostFrequentShippingAddress(customers[i].ID)
		if err != nil {
			return nil, 0, fmt.Errorf("something went wrong")
		}
		customers[i].State = shippingProfile.State
	}
	sort.Slice(customers, func(i, j int) bool {
		return customers[i].TotalSpent > customers[j].TotalSpent
	})
	return customers, total, nil
}

func (s *BusinessService) GetProductRanking(userId string, page, limit int) ([]domain.ProductRanking, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	products, total, err := s.businessRepo.GetProductRanking(business.ID, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	sort.Slice(products, func(i, j int) bool {
		return products[i].TotalSales > products[j].TotalSales
	})
	return products, total, nil
}

func (s *BusinessService) GetCustomerAnalytics(userId string, dateStr string) (*domain.AnalyticsResponse, error) {
	var date time.Time

	if dateStr == "" {
		date = time.Now()
	} else {
		var err error
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			return nil, fmt.Errorf("invalid date format, please use YYYY-MM-DD")
		}
	}

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

	return s.businessRepo.GetCustomerAnalytics(business.ID, date)
}

func (s *BusinessService) GetSalesAnalytics(userId string, dateStr string) (*domain.AnalyticsResponse, error) {
	var date time.Time

	if dateStr == "" {
		date = time.Now()
	} else {
		var err error
		date, err = time.Parse("2006-01-02", dateStr)
		if err != nil {
			return nil, fmt.Errorf("invalid date format, please use YYYY-MM-DD")
		}
	}

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
	return s.businessRepo.GetSalesAnalytics(business.ID, date)
}

func (s *BusinessService) GetStoreAnalytics(businessId string) (*domain.StoreAnalyticsResponse, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": businessId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid user")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, fmt.Errorf("invalid business")
	}

	fmt.Println("business.ID; ", business.ID)
	return s.businessRepo.GetStoreAnalytics(business.ID)
}

func (s *BusinessService) GetDashboardAnalytics(userId string) (*domain.AnalyticsResponse, error) {
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

	return s.businessRepo.GetDashboardAnalytics(business.ID)
}

func (s *BusinessService) GetAllProducts(userId, search string, page, limit int) ([]domain.Product, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	// Seller managing their own catalog sees out-of-stock products too.
	products, totalItems, err := s.productRepo.GetAllPaginated(map[string]interface{}{"business_id": business.ID}, search, page, limit, false)
	if err != nil {
		return nil, 0, errors.New("error fetching products")
	}

	return products, totalItems, nil
}

func (s *BusinessService) GetDiscounts(userId, search string, page, limit int) ([]domain.Discount, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	discounts, totalItems, err := s.discountRepo.GetDiscounts(map[string]interface{}{"business_id": business.ID}, search, page, limit)
	if err != nil {
		return nil, 0, errors.New("error fetching discounts")
	}

	return discounts, totalItems, nil
}

func (s *BusinessService) GetFollowers(userId, search string, page, limit int) ([]domain.Follower, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	followers, totalItems, err := s.businessRepo.GetFollowers(map[string]interface{}{"business_id": business.ID}, search, page, limit)
	if err != nil {
		return nil, 0, errors.New("error fetching followers")
	}

	return followers, totalItems, nil
}

func (s *BusinessService) CreateDiscount(userId string, payload requests.CreateDiscount) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}

	validFrom, err := time.Parse(time.RFC3339, payload.ValidFrom)
	if err != nil {
		return fmt.Errorf("invalid valid_from format")
	}
	validTo, err := time.Parse(time.RFC3339, payload.ValidTo)
	if err != nil {
		return fmt.Errorf("invalid valid_to format")
	}

	existing, _ := s.discountRepo.GetOne(map[string]interface{}{
		"business_id": business.ID,
		"title":       payload.Title,
	})
	if existing != nil {
		return fmt.Errorf("a discount with this title already exists")
	}
	existing, _ = s.discountRepo.GetOne(map[string]interface{}{
		"business_id": business.ID,
		"code":        payload.Code,
	})
	if existing != nil {
		return fmt.Errorf("a discount with this code already exists")
	}

	discount := &domain.Discount{
		BusinessID:   business.ID,
		Type:         payload.Type,
		Title:        payload.Title,
		Code:         payload.Code,
		DiscountType: payload.DiscountType,
		Amount:       payload.Amount,
		ApplyTo:      payload.ApplyTo,
		MinEnabled:   payload.MinRequirement.Enabled,
		MinType:      payload.MinRequirement.Type,
		MinThreshold: payload.MinRequirement.Threshold,
		LimitEnabled: payload.Limit.Enabled,
		LimitType:    payload.Limit.Type,
		LimitValue:   payload.Limit.LimitPerValue,
		ValidFrom:    validFrom,
		ValidTo:      validTo,
	}

	if payload.ApplyTo == "products" && len(payload.ProductIDs) > 0 {
		for _, id := range payload.ProductIDs {
			product, err := s.productRepo.Find(id)
			if err != nil {
				continue
			}
			if product.BusinessID == business.ID {
				discount.Products = append(discount.Products, &product)
			}
		}
	}

	_, err = s.discountRepo.Create(discount)
	if err != nil {
		return fmt.Errorf("failed to create discount")
	}

	return nil
}

func (s *BusinessService) UpdateBankAccountDetail(id string, userID string, data requests.BusinessBankAccountDetail) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}

	existingAccount, err := s.businessRepo.FindAccountDetailsByIDAndBusiness(id, business.ID)
	if err != nil {
		return fmt.Errorf("bank account not found")
	}

	duplicateAccount, err := s.businessRepo.FindBankAccount(map[string]interface{}{
		"business_id":    business.ID,
		"account_number": data.AccountNumber,
		"bank_code":      data.BankCode,
	})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		logger.Error(err)
		return fmt.Errorf("something went wrong")
	}
	if duplicateAccount != nil && duplicateAccount.ID != existingAccount.ID {
		return fmt.Errorf("another bank account with same details already exists")
	}

	if data.IsDefault {
		err = s.businessRepo.UnsetOtherDefaultAccounts(business.ID)
		if err != nil {
			logger.Error(err)
			return fmt.Errorf("something went wrong")
		}
	}

	account := domain.BusinessBankAccountDetail{
		Bank:          data.Bank,
		AccountNumber: data.AccountNumber,
		AccountName:   data.AccountName,
		BankCode:      data.BankCode,
		IsDefault:     data.IsDefault,
	}

	if err := s.businessRepo.UpdateAccountDetails(id, account); err != nil {
		return err
	}

	// NS2 seller.payout.bank_changed — security alert, in-app + WhatsApp, best-effort.
	bankLabel := data.Bank
	if len(data.AccountNumber) >= 4 {
		bankLabel = data.Bank + " ••" + data.AccountNumber[len(data.AccountNumber)-4:]
	}
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.payout.bank_changed",
		UserID: userID,
		Vars:   map[string]string{"bank": bankLabel},
	})

	return nil
}

func (s *BusinessService) AddBankAccountDetail(userID string, req requests.BusinessBankAccountDetail) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}

	existingAccount, err := s.businessRepo.FindBankAccount(map[string]interface{}{
		"business_id":    business.ID,
		"account_number": req.AccountNumber,
		"bank_code":      req.BankCode,
	})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		logger.Error(err)
		return fmt.Errorf("something went wrong")
	}
	if existingAccount != nil {
		return fmt.Errorf("bank account already exists")
	}

	if req.IsDefault {
		err := s.businessRepo.UnsetOtherDefaultAccounts(business.ID)
		if err != nil {
			logger.Error(err)
			return fmt.Errorf("something went wrong")
		}
	}

	account := &domain.BusinessBankAccountDetail{
		Bank:          req.Bank,
		AccountNumber: req.AccountNumber,
		AccountName:   req.AccountName,
		BankCode:      req.BankCode,
		BusinessID:    business.ID,
		IsDefault:     req.IsDefault,
	}

	err = s.businessRepo.CreateBankAccount(account)
	if err != nil {
		logger.Error(err)
		return fmt.Errorf("something went wrong")
	}

	// NS2 seller.payout.bank_added (in-app).
	bankLabel := req.Bank
	if len(req.AccountNumber) >= 4 {
		bankLabel = req.Bank + " ••" + req.AccountNumber[len(req.AccountNumber)-4:]
	}
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.payout.bank_added",
		UserID: userID,
		Vars:   map[string]string{"bank": bankLabel},
	})

	return nil
}

func (s *BusinessService) GetBankAccounts(userID string, page int, limit int) ([]domain.BusinessBankAccountDetail, int64, error) {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("invalid user")
		}
		return nil, 0, fmt.Errorf("something went wrong")
	}
	if business == nil {
		return nil, 0, fmt.Errorf("invalid business")
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	return s.businessRepo.GetBankAccounts(business.ID, limit, offset)
}

func (s *BusinessService) DeleteBankAccountDetail(id string, userID string) error {
	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}

	// Verify the bank account exists and belongs to this business
	existingAccount, err := s.businessRepo.FindAccountDetailsByIDAndBusiness(id, business.ID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("bank account not found")
		}
		return fmt.Errorf("something went wrong")
	}
	if existingAccount == nil {
		return fmt.Errorf("bank account not found")
	}

	return s.businessRepo.DeleteBankAccount(id, business.ID)
}

func (s *BusinessService) GetOneProduct(userId, id string) (*domain.Product, error) {
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
	// Use GetOneWithAssociations to ensure variant custom properties are loaded
	product, err := s.productRepo.GetOneWithAssociations(map[string]interface{}{"id": id, "business_id": business.ID})
	if err != nil {
		return nil, errors.New("error fetching product")
	}
	return product, nil
}

// CalculateProductCombinations calculates variant combinations for a product
func (s *BusinessService) CalculateProductCombinations(product *domain.Product) []map[string]interface{} {
	return s.productService.CalculateCombinations(product)
}
