package services

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/shipping"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type ShippingService struct {
	shippingRepo      ports.ShippingInterface
	userRepo          ports.UserRepoInterface
	orderRepo         ports.OrderRepoInterface
	productRepo       ports.ProductRepoIface
	shipbubbleService *shipping.ShipbubbleService
	productService    *ProductService
	businessRepo      ports.BusinessIface
}

func NewShippingService(db *gorm.DB) *ShippingService {
	return &ShippingService{
		shippingRepo:      mysql_repo.NewShippingRepository(db),
		userRepo:          mysql_repo.NewUserRepository(db),
		orderRepo:         mysql_repo.NewOrderRepository(db),
		productRepo:       mysql_repo.NewProductRepository(db),
		businessRepo:      mysql_repo.NewBusinessRepository(db),
		shipbubbleService: shipping.NewShipbubbleService(),
		productService:    NewProductService(db),
	}
}

func (s *ShippingService) AddShippingProfile(input requests.ShippingProfile, userId string, isGuest bool) (*domain.ShippingProfile, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}

	if input.ShippingUser == nil {
		input.ShippingUser = &requests.ShippingUser{
			FirstName: user.Firstname,
			LastName:  user.Lastname,
			Phone:     user.Phone,
			Email:     user.Email,
		}
	}

	existingProfiles, err := s.shippingRepo.FindByFields(map[string]interface{}{
		"user_id": userId,
		"street":  input.Street,
		"town":    input.Town,
		"state":   input.State,
		"country": input.Country,
	}, isGuest)
	if err != nil {
		return nil, fmt.Errorf("error checking existing addresses: %v", err)
	}

	if len(existingProfiles) > 0 {
		return nil, fmt.Errorf("address already exists in user profile")
	}

	shipbubbleData, err := s.shipbubbleService.ValidateAddress(shipping.ShipbubbleAddressInfo{
		Email:   input.ShippingUser.Email,
		Phone:   input.ShippingUser.Phone,
		Name:    fmt.Sprintf(`%s %s`, input.ShippingUser.FirstName, input.ShippingUser.LastName),
		Address: input.GetFormatedAddress(),
	})
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}

	shippingData := domain.ShippingProfile{}
	helper.Copy(input, &shippingData)
	shippingData.Latitude = shipbubbleData.Latitude
	shippingData.Longitude = shipbubbleData.Longitude
	shippingData.ShipbubbleAddressCode = shipbubbleData.AddressCode
	shippingData.UserID = userId

	data, err := s.shippingRepo.AddShippingProfile(&shippingData, isGuest)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}
	return data, nil
}

func (s *ShippingService) UpdateShippingProfile(id string, input requests.ShippingProfile, userId string, isGuest bool) (*domain.ShippingProfile, error) {
	existingProfile, err := s.shippingRepo.FindShippingProfile(id, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if existingProfile == nil {
		return nil, fmt.Errorf("invalid profile")
	}

	if existingProfile.UserID != userId {
		return nil, fmt.Errorf("userId mismatch")
	}

	addressChanged := input.Street != existingProfile.Street ||
		input.Town != existingProfile.Town ||
		input.State != existingProfile.State ||
		input.Country != existingProfile.Country

	if addressChanged {
		shipbubbleData, err := s.shipbubbleService.ValidateAddress(shipping.ShipbubbleAddressInfo{
			Email:   input.ShippingUser.Email,
			Phone:   input.ShippingUser.Phone,
			Name:    fmt.Sprintf("%s %s", input.ShippingUser.FirstName, input.ShippingUser.LastName),
			Address: input.GetFormatedAddress(),
		})
		if err != nil {
			return nil, fmt.Errorf("address validation failed")
		}

		existingProfile.Latitude = shipbubbleData.Latitude
		existingProfile.Longitude = shipbubbleData.Longitude
		existingProfile.ShipbubbleAddressCode = shipbubbleData.AddressCode
	}

	helper.Copy(input, &existingProfile)

	updatedProfile, err := s.shippingRepo.UpdateShippingProfile(id, *existingProfile, isGuest)
	if err != nil {
		return nil, fmt.Errorf("failed to update shipping profile")
	}

	return updatedProfile, nil
}

func (s *ShippingService) DeleteShippingProfile(id string, userId string, isGuest bool) error {
	existingProfile, err := s.shippingRepo.FindShippingProfile(id, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if existingProfile == nil {
		return fmt.Errorf("invalid profile")
	}

	if existingProfile.UserID != userId {
		return fmt.Errorf("userId mismatch")
	}
	err = s.shippingRepo.DeleteShippingProfile(id, isGuest)
	if err != nil {
		return fmt.Errorf("failed to delete shipping profile")
	}
	return nil
}

func (s *ShippingService) SetDefaultShippingProfile(id string, userId string, isGuest bool) (*domain.ShippingProfile, error) {
	existingProfile, err := s.shippingRepo.FindShippingProfile(id, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if existingProfile == nil {
		return nil, fmt.Errorf("invalid profile")
	}

	if existingProfile.UserID != userId {
		return nil, fmt.Errorf("userId mismatch")
	}

	existingProfile.IsDefault = true

	updatedProfile, err := s.shippingRepo.UpdateShippingProfile(id, *existingProfile, isGuest)
	if err != nil {
		return nil, fmt.Errorf("failed to update shipping profile")
	}

	return updatedProfile, nil
}

func (s *ShippingService) GetAllShippingProfile(userId string, isGuest bool, page, limit int) ([]domain.ShippingProfile, int64, error) {
	profiles, total, err := s.shippingRepo.GetAllShippingProfiles(map[string]interface{}{"user_id": userId}, isGuest, page, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("something went wrong")
	}
	return profiles, total, nil
}

func (s *ShippingService) GetShippingProfile(id, userId string, isGuest bool) (*domain.ShippingProfile, error) {
	existingProfile, err := s.shippingRepo.FindShippingProfile(id, isGuest)
	if err != nil {
		if errors.Is(gorm.ErrRecordNotFound, err) {
			return nil, fmt.Errorf("invalid profile id")
		}
		return nil, fmt.Errorf("something went wrong")
	}
	if existingProfile.UserID != userId {
		return nil, fmt.Errorf("userId mismatch")
	}

	return existingProfile, nil
}

func (s *ShippingService) GetShippingOptions(request requests.ShippingOptionRequest, userId string, isGuest bool) ([]domain.ShippingOption, error) {
	fmt.Printf("🔥 SERVICE DEBUG: GetShippingOptions called with ProductId: %s, Street: %s, Town: %s, State: %s, Country: %s\n",
		request.ProductId, request.Street, request.Town, request.State, request.Country)
	product, err := s.productRepo.GetOne(map[string]interface{}{"id": request.ProductId})
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}

	if product == nil {
		return nil, fmt.Errorf("invalid product")
	}
	business, err := s.businessRepo.Find(product.BusinessID)
	if err != nil {
		return nil, fmt.Errorf("product with id not found")
	}

	// Two-source delivery (Shipping D). The seller's own delivery is the always-
	// available option; Partner couriers (Shipbubble, nationwide) are attempted on
	// top when enabled. If Shipbubble can't quote — outage, sender address not set
	// up, or a route it doesn't service — we DEGRADE to the seller's own delivery
	// rather than dead-ending checkout (A2b). Shipbubble decides coverage; there
	// is no hardcoded Lagos gate.
	partnerEnabled := business.BusinessSetting == nil || business.BusinessSetting.PartnerEnabled
	selfOpt := s.buildSelfOption(business, request)

	if !partnerEnabled {
		if selfOpt == nil {
			return nil, fmt.Errorf("this seller has no delivery option for your address yet")
		}
		return s.shippingRepo.CreateShippingRates([]domain.ShippingOption{*selfOpt}, isGuest)
	}

	courierOptions, cerr := s.fetchCourierOptions(product, business, request, userId, isGuest)
	if cerr != nil {
		// Couriers unavailable — degrade to the seller's own delivery.
		logger.Error(fmt.Errorf("courier options unavailable, using self only: %w", cerr))
		if selfOpt == nil {
			return nil, fmt.Errorf("this seller has no delivery option for your address yet")
		}
		return s.shippingRepo.CreateShippingRates([]domain.ShippingOption{*selfOpt}, isGuest)
	}

	options := courierOptions
	if selfOpt != nil {
		options = append(options, *selfOpt)
	}
	return s.shippingRepo.CreateShippingRates(options, isGuest)
}

// fetchCourierOptions runs the Shipbubble pipeline (category → sender address →
// receiver validation → rate fetch) for the buyer's address and returns the
// courier options. Any failure — misconfigured sender, Shipbubble down, or a
// route it can't service — is returned as an error so the caller degrades to the
// seller's own delivery instead of failing checkout.
func (s *ShippingService) fetchCourierOptions(product *domain.Product, business domain.Business, request requests.ShippingOptionRequest, userId string, isGuest bool) ([]domain.ShippingOption, error) {
	// Get external category mapping with enhanced smart selection
	var externalCategory *domain.ExternalCategory
	var externalCategoryId string

	// Get product dimensions for smart selection
	productWeight := s.getProductWeight(product)
	productLength := s.getProductLength(product)
	productWidth := s.getProductWidth(product)
	productHeight := s.getProductHeight(product)

	// First, try to get external_category_id directly from product
	if product.ExternalCategoryId != "" {
		externalCategoryId = product.ExternalCategoryId
		fmt.Printf("🔥 SHIPPING DEBUG: Using product external_category_id: %s\n", externalCategoryId)
	} else {
		// Use smart category selection based on category, subcategory, and product dimensions
		categoryName := product.Category.Name
		subcategoryName := ""
		if product.SubCategory.Name != "" {
			subcategoryName = product.SubCategory.Name
		}

		externalCategoryId = s.getSmartShipbubbleCategoryId(categoryName, subcategoryName, productWeight, productLength, productWidth, productHeight)
		fmt.Printf("🔥 SHIPPING DEBUG: Smart selected external_category_id: %s for %s -> %s (weight: %.2f kg)\n",
			externalCategoryId, categoryName, subcategoryName, productWeight)
	}

	// Get the external category mapping
	externalCategory, err := s.shippingRepo.FindExternalCategoryById(externalCategoryId)
	if err != nil {
		fmt.Printf("🔥 SHIPPING DEBUG: FindExternalCategoryById error for ID '%s': %v\n", externalCategoryId, err)
		return nil, fmt.Errorf("something went wrong")
	}

	fmt.Println("externalCategory; ", externalCategory.ProviderId)

	categoryId, err := strconv.Atoi(externalCategory.ProviderId)
	if err != nil {
		fmt.Printf("something went wrong: %v", err)
		return nil, fmt.Errorf("something went wrong")
	}

	if business.Address == nil {
		return nil, fmt.Errorf("invalid vendor address")
	}

	senderAddressCode := business.Address.ShipbubbleAddressCode
	if senderAddressCode == 0 {
		// Only substitute a mock sender code in local mock mode. In real envs a
		// store without a validated Shipbubble address must NOT quote against a
		// bogus sender (it yields wrong/zero rates) — surface it so the seller
		// completes their store address at setup.
		if os.Getenv("ENV") == "local" && os.Getenv("ENABLE_MOCK_SERVICES") == "true" {
			senderAddressCode = 123456789
			fmt.Printf("🔥 SHIPPING DEBUG: [mock] business has no Shipbubble address code, using mock: %d\n", senderAddressCode)
		} else {
			return nil, fmt.Errorf("store shipping address is not set up; please complete your store address")
		}
	}

	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		fmt.Printf("something went wrong: %v", err)
		return nil, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}

	if user != nil {
		request.ShippingUser = &requests.ShippingUser{
			FirstName: user.Firstname,
			LastName:  user.Lastname,
			Phone:     user.Phone,
			Email:     user.Email,
		}
	}

	// Prepare receiver address data for Shipbubble validation
	receiverAddress := shipping.ShipbubbleAddressInfo{
		Email:   request.ShippingUser.Email,
		Phone:   request.ShippingUser.Phone,
		Name:    fmt.Sprintf(`%s %s`, request.ShippingUser.FirstName, request.ShippingUser.LastName),
		Address: request.GetFormatedAddress(),
	}

	fmt.Printf("🔥🔥🔥 CRITICAL DEBUG - Calling Shipbubble ValidateAddress 🔥🔥🔥\n")
	fmt.Printf("Business: %s (ID: %s)\n", business.Name, business.ID)
	fmt.Printf("Business Phone: %s, Email: %s\n", business.Phone, business.Email)
	fmt.Printf("Business Address Code: %d\n", senderAddressCode)
	fmt.Printf("Receiver Data - Name: '%s', Email: '%s', Phone: '%s', Address: '%s'\n",
		receiverAddress.Name, receiverAddress.Email, receiverAddress.Phone, receiverAddress.Address)

	shipbubbleData, err := s.shipbubbleService.ValidateAddress(receiverAddress)
	if err != nil {
		fmt.Printf("❌❌❌ SHIPBUBBLE VALIDATE ADDRESS FAILED ❌❌❌\n")
		fmt.Printf("Error: %v\n", err)
		fmt.Println("error validating shipbubble address; ", err)
		return nil, fmt.Errorf("something went wrong")
	}

	req := shipping.FetchRatesRequest{
		SenderAddressCode:   senderAddressCode,
		ReceiverAddressCode: shipbubbleData.AddressCode,
		PickupDate:          time.Now().Format("2006-01-02"),
		CategoryID:          categoryId,
		PackageItems: []shipping.PackageItem{
			{
				Name:        product.Title,
				Description: product.Description,
				UnitWeight:  productWeight,
				UnitAmount:  product.Price,
				Quantity:    request.Quantity,
			},
		},
		PackageDimension: shipping.PackageDimension{
			Length: productLength,
			Width:  productWidth,
			Height: productHeight,
		},
		DeliveryInstructions: "delivery from Vibaar",
	}
	shipBubbleResponse, err := s.shipbubbleService.FetchShippingRates(req)
	if err != nil {
		logger.Error(err)
		fmt.Println("error getting shipbubble rates; ", err)
		return nil, fmt.Errorf("something went wrong")
	}

	fmt.Println("shipBubbleResponse", shipBubbleResponse)
	rates, err := s.shipbubbleService.GetRatesResponse(shipBubbleResponse, shipbubbleData.AddressCode)
	if err != nil {
		fmt.Println("error getting shipbubble rates; ", err)
		return nil, fmt.Errorf("something went wrong")
	}
	var options []domain.ShippingOption
	helper.Copy(rates, &options)

	// Store request_token in each option's provider_data for shipment creation
	for i := range options {
		options[i].Provider = "shipbubble"
		options[i].ProviderID = shipBubbleResponse.Data.RequestToken

		// Add request_token to provider_data for later shipment creation
		if len(options[i].ProviderData) > 0 {
			options[i].ProviderData[0]["request_token"] = shipBubbleResponse.Data.RequestToken
		}
	}

	return options, nil
}

// zoneFor resolves the buyer's delivery zone relative to the seller's own
// location: same state = local, same country = interstate, else international.
// An unknown seller country is treated as same-country (Nigeria-focused app).
func zoneFor(request requests.ShippingOptionRequest, sellerState, sellerCountry string) string {
	if sellerCountry != "" && !strings.EqualFold(request.Country, sellerCountry) {
		return "international"
	}
	if strings.EqualFold(request.State, sellerState) {
		return "local"
	}
	return "interstate"
}

// buildSelfOption returns the seller's own-delivery option for the buyer's zone,
// or nil when that zone isn't enabled/priced. The rate must be > 0: the P3
// migration backfilled Local rate 0 for sellers who never set one, and a ₦0
// "free delivery" option must not surface until the seller configures it in the
// shipping setup.
func (s *ShippingService) buildSelfOption(business domain.Business, request requests.ShippingOptionRequest) *domain.ShippingOption {
	setting := business.BusinessSetting
	if setting == nil {
		return nil
	}

	sellerState, sellerCountry := "", ""
	if business.Address != nil {
		if business.Address.Area != nil {
			sellerState = *business.Address.Area
		}
		sellerCountry = business.Address.Country
	}

	zone := zoneFor(request, sellerState, sellerCountry)
	var zr domain.ZoneRate
	switch zone {
	case "local":
		zr = setting.SelfZones.Local
	case "interstate":
		zr = setting.SelfZones.Interstate
	default:
		zr = setting.SelfZones.International
	}
	if !zr.Enabled || zr.Rate <= 0 {
		return nil
	}

	name := business.Name
	if name == "" {
		name = "Seller"
	}
	return &domain.ShippingOption{
		Provider:          "self",
		DeliveryType:      fmt.Sprintf("%s delivery", name),
		Description:       "Delivered directly by the seller",
		DeliveryDaysRange: zr.Eta, // the seller's delivery-time estimate (json delivery_days)
		Price:             shipping.FormatPrice("NGN", zr.Rate),
		ProviderData: domain.MapArray{{
			"self":         true,
			"zone":         zone,
			"seller_state": sellerState,
			"rate":         zr.Rate,
			"delivery_eta": zr.Eta,
		}},
	}
}

func (s *ShippingService) CreateShipment(orderId string, isGuest bool) error {
	fmt.Printf("DEBUG CreateShipment: Starting for orderId=%s, isGuest=%v\n", orderId, isGuest)

	item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{
		"id": orderId,
	}, isGuest)
	if err != nil {
		fmt.Printf("DEBUG CreateShipment: Error getting order item for orderId=%s, err=%v\n", orderId, err)
		return fmt.Errorf("failed to get order item: %v", err)
	}
	if item == nil {
		fmt.Printf("DEBUG CreateShipment: Order item is nil for orderId=%s\n", orderId)
		return errors.New("order not found")
	}
	fmt.Printf("DEBUG CreateShipment: Found order item with ShippingOptionID=%s\n", item.ShippingOptionID)

	shippingOption, err := s.shippingRepo.GetOneShippingRate(map[string]interface{}{"id": item.ShippingOptionID}, isGuest)
	if err != nil {
		fmt.Printf("DEBUG CreateShipment: Error getting shipping option for ID=%s, err=%v\n", item.ShippingOptionID, err)
		return err
	}
	fmt.Printf("DEBUG CreateShipment: Found shipping option with ProviderID=%s\n", shippingOption.ProviderID)
	fmt.Printf("DEBUG CreateShipment: ProviderData length=%d\n", len(shippingOption.ProviderData))

	if len(shippingOption.ProviderData) == 0 {
		fmt.Printf("DEBUG CreateShipment: ProviderData is empty!\n")
		return errors.New("shipping option has no provider data")
	}

	fmt.Printf("DEBUG CreateShipment: ProviderData[0]=%+v\n", shippingOption.ProviderData[0])

	// Self delivery (Shipping D): the seller fulfils it themselves — no provider
	// call, and none of the request_token / service_code / courier_id the courier
	// path below requires. Record a self shipment + attach it to the item;
	// fulfilment is driven by the seller's own status updates, not the Shipbubble
	// webhook.
	if shippingOption.Provider == "self" {
		shipment, err := s.shippingRepo.CreateShipment(&domain.Shipment{
			Provider:     "self",
			OrderID:      item.OrderID,
			ProviderData: shippingOption.ProviderData,
		}, isGuest)
		if err != nil {
			return err
		}
		item.ShipmentID = shipment.ID
		if _, err = s.orderRepo.UpdateOrderItem(item.ID, *item, isGuest); err != nil {
			return err
		}
		return nil
	}

	// Check if this is mock data
	isMockInterface, isMockExists := shippingOption.ProviderData[0]["mock"]
	isMock := false
	if isMockExists {
		if mockBool, ok := isMockInterface.(bool); ok {
			isMock = mockBool
		}
	}

	// Safely extract request_token, service_code and courier_id with type assertions
	requestTokenInterface, requestTokenExists := shippingOption.ProviderData[0]["request_token"]
	serviceCodeInterface, serviceCodeExists := shippingOption.ProviderData[0]["service_code"]
	courierIdInterface, courierIdExists := shippingOption.ProviderData[0]["courier_id"]

	if !serviceCodeExists {
		fmt.Printf("DEBUG CreateShipment: service_code not found in ProviderData[0]\n")
		return errors.New("service_code not found in shipping option")
	}
	if !courierIdExists {
		fmt.Printf("DEBUG CreateShipment: courier_id not found in ProviderData[0]\n")
		return errors.New("courier_id not found in shipping option")
	}

	serviceCode, serviceCodeOk := serviceCodeInterface.(string)
	courierID, courierIdOk := courierIdInterface.(string)

	if !serviceCodeOk {
		fmt.Printf("DEBUG CreateShipment: service_code is not a string: %+v (type: %T)\n", serviceCodeInterface, serviceCodeInterface)
		return errors.New("service_code is not a string")
	}
	if !courierIdOk {
		fmt.Printf("DEBUG CreateShipment: courier_id is not a string: %+v (type: %T)\n", courierIdInterface, courierIdInterface)
		return errors.New("courier_id is not a string")
	}

	// Use request_token from provider_data if available, otherwise fall back to ProviderID
	requestToken := shippingOption.ProviderID
	if requestTokenExists {
		if token, ok := requestTokenInterface.(string); ok {
			requestToken = token
		}
	}

	fmt.Printf("DEBUG CreateShipment: About to call Shipbubble API with RequestToken=%s, ServiceCode=%s, CourierID=%s, IsMock=%v\n",
		requestToken, serviceCode, courierID, isMock)

	var shipmentProviderID string
	var shipmentProviderData domain.MapArray

	// Handle mock shipments differently
	if isMock {
		fmt.Println("DEBUG CreateShipment: Processing mock shipment")
		// Get order and shipping profile for ship_to information
		order, _ := s.orderRepo.GetOneOrder(map[string]interface{}{
			"id": item.OrderID,
		}, isGuest)

		// Get shipping profile for address details
		var shipTo map[string]interface{}
		var shipFrom map[string]interface{}

		if order != nil && order.ShippingProfileID != "" {
			shippingProfile, _ := s.shippingRepo.FindShippingProfile(order.ShippingProfileID, isGuest)

			if shippingProfile != nil {
				shipTo = map[string]interface{}{
					"name":    fmt.Sprintf("%s %s", shippingProfile.ShippingUser.FirstName, shippingProfile.ShippingUser.LastName),
					"phone":   shippingProfile.ShippingUser.Phone,
					"email":   shippingProfile.ShippingUser.Email,
					"address": fmt.Sprintf("%s, %s, %s, %s", shippingProfile.Street, shippingProfile.Town, shippingProfile.State, shippingProfile.Country),
				}
			}
		}

		// Default ship_to if not found
		if shipTo == nil {
			shipTo = map[string]interface{}{
				"name":    "Test Customer",
				"phone":   "+2348123456789",
				"email":   "customer@example.com",
				"address": "123 Test Street, Lagos, Nigeria",
			}
		}

		// Mock ship_from (seller's address)
		shipFrom = map[string]interface{}{
			"name":    "Test Store",
			"phone":   "+2348987654321",
			"email":   "store@example.com",
			"address": "456 Store Street, Lagos, Nigeria",
		}

		// For mock shipments, create a mock response without calling the API
		mockOrderID := fmt.Sprintf("MOCK_%s_%d", helper.RandomString(6), time.Now().Unix())
		shipmentProviderID = mockOrderID
		shipmentProviderData = domain.MapArray{{
			"mock":         true,
			"order_id":     mockOrderID,
			"service_code": serviceCode,
			"courier_id":   courierID,
			"status":       "processing",
			"tracking_url": fmt.Sprintf("https://mock-tracking.example.com/track/%s", mockOrderID),
			"created_at":   time.Now().Format("2006-01-02 15:04:05"),
			"courier_name": shippingOption.ProviderData[0]["courier_name"],
			"shipping_fee": shippingOption.ProviderData[0]["rate_card_amount"],
			"ship_to":      shipTo,
			"ship_from":    shipFrom,
			"courier": map[string]interface{}{
				"name":  "Mock Courier",
				"email": "courier@mock.com",
				"phone": "+2348123456789",
			},
		}}
	} else {
		// Real Shipbubble API call
		fmt.Println("creating shipping option: ", shippingOption)
		shipBubbleShipment, err := s.shipbubbleService.CreateShipment(shipping.CreateShipmentRequest{
			RequestToken: requestToken,
			ServiceCode:  serviceCode,
			CourierID:    courierID,
		})
		if err != nil {
			fmt.Printf("DEBUG CreateShipment: Shipbubble API call failed with error: %v\n", err)
			fmt.Println("error creating shipBubbleShipment; ", err)
			return err
		}
		fmt.Printf("DEBUG CreateShipment: Shipbubble API call successful, response status=%s\n", shipBubbleShipment.Status)
		if shipBubbleShipment.Status == "failed" {
			return errors.New("error creating shipping")
		}
		shipmentProviderID = shipBubbleShipment.Data.OrderID
		shipmentProviderData = s.shipbubbleService.ConvertOrderToProviderData(shipBubbleShipment.Data)
	}

	shipment, err := s.shippingRepo.CreateShipment(&domain.Shipment{
		Provider:     shippingOption.Provider,
		ProviderID:   shipmentProviderID,
		OrderID:      item.OrderID,
		ProviderData: shipmentProviderData,
	}, isGuest)
	if err != nil {
		return err
	}

	item.ShipmentID = shipment.ID
	_, err = s.orderRepo.UpdateOrderItem(item.ID, *item, isGuest)
	if err != nil {
		return err
	}

	_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
		Title:    string(helper.OrderActivityShippingProcessing),
		Subtitle: "Shipment Created & Assigned",
		Details:  "Your order is assigned to a delivery partner.",
		Time:     time.Now().String(),
	}, "buyer", false)
	if err != nil {
		return fmt.Errorf("something went wrong")
	}
	_, err = s.orderRepo.AppendActivity(item.ID, domain.OrderActivity{
		Title:    string(helper.OrderActivityShippingProcessing),
		Subtitle: "Shipment Created & Assigned",

		Details: "Your order is assigned to a delivery partner.",
		Time:    time.Now().String(),
	}, "seller", false)
	if err != nil {
		return fmt.Errorf("something went wrong")
	}

	return nil
}

// mapCategoryToExternalCategory maps internal category IDs to external category IDs
func (s *ShippingService) mapCategoryToExternalCategory(categoryId string) string {
	// Smart mapping using the new comprehensive category system
	// First try to get category and use smart selection
	category, err := s.shippingRepo.FindCategoryById(categoryId)
	if err == nil && category != nil {
		return s.getSmartShipbubbleCategoryId(category.Name, "", 0, 0, 0, 0)
	}

	// Fallback mappings for existing categories (using proper Shipbubble category IDs)
	categoryMappings := map[string]string{
		"c5fdc257-f40b-4ab4-be46-5cde58ff79c2": "3035980",  // Electronics -> Electronics
		"9aebee99-0435-4ca1-bf82-7657bd35691a": "98246239", // Fashion -> Fashion wears
		"cb89a32d-f8af-425d-a579-3f7b26dd9671": "69709726", // Food & Beverages -> Food
		"695d1642-bfaa-400a-95a7-38509c1e307f": "90097994", // Books -> Accessories (light items)
		"0008ccd9-1119-46c4-be2c-0b219d090bf8": "90097994", // Home & Garden -> Accessories
	}

	if externalId, exists := categoryMappings[categoryId]; exists {
		return externalId
	}

	// Default fallback to light weight items
	return "20754594"
}

// getSmartShipbubbleCategoryId provides intelligent Shipbubble category selection
func (s *ShippingService) getSmartShipbubbleCategoryId(categoryName, subcategoryName string, weight, length, width, height float64) string {
	// Food & Beverages smart selection
	if categoryName == "Food & Beverages" {
		// For now, use the main Food category - can be refined later with specific subcategories
		return "69709726" // Food
	}

	// Home & Living smart selection
	if categoryName == "Home & Living" {
		if subcategoryName == "Furniture" || weight > 10 {
			return "25590994" // Furniture and fittings
		}
		return "20754594" // Light weight items (for decor, kitchen items)
	}

	// Auto & Accessories smart selection
	if categoryName == "Auto & Accessories" {
		if subcategoryName == "Auto Parts & Tools" || weight > 2 {
			return "67008831" // Machinery
		}
		return "20754594" // Light weight items (for accessories, care products)
	}

	// Sports & Outdoor smart selection
	if categoryName == "Sports & Outdoor" {
		if subcategoryName == "Fitness Equipment" || subcategoryName == "Cycling & Bicycles" || weight > 4 {
			return "67008831" // Machinery
		}
		return "20754594" // Light weight items (for smaller outdoor gear)
	}

	// Music & Entertainment smart selection
	if categoryName == "Music & Entertainment" {
		if subcategoryName == "Concert & DJ Equipment" || weight > 5 {
			return "77179563" // Electronics and gadgets
		}
		return "20754594" // Light weight items (for smaller instruments)
	}

	// Default category mappings using confirmed Shipbubble category IDs
	categoryMap := map[string]string{
		"Men's Fashion":          "98246239", // Fashion wears
		"Women's Fashion":        "98246239", // Fashion wears
		"Kids Fashion":           "98246239", // Fashion wears
		"Beauty & Personal Care": "90097994", // Accessories
		"Gadgets":                "70830897", // Electronic gadgets
		"Electronics":            "3035980",  // Electronics
		"Books & Educational":    "90097994", // Accessories (light items)
		"Jewelry":                "66484941", // Jewelry
		"Other":                  "90097994", // Accessories
	}

	if externalId, exists := categoryMap[categoryName]; exists {
		return externalId
	}

	return "90097994" // Default fallback to Accessories
}

// Helper methods to get shipping dimensions with enhanced fallbacks including subcategory defaults
func (s *ShippingService) getProductWeight(product *domain.Product) float64 {
	// 1. Product-specific shipping weight (highest priority)
	if product.ShippingWeightKg > 0 {
		return product.ShippingWeightKg
	}

	// 2. General product weight
	if product.Weight > 0 {
		return product.Weight
	}

	// 3. Subcategory default weight
	if product.SubCategory.DefaultWeight > 0 {
		fmt.Printf("🔥 SHIPPING DEBUG: Using subcategory default weight: %.2f kg\n", product.SubCategory.DefaultWeight)
		return product.SubCategory.DefaultWeight
	}

	// 4. Category-based default weight
	defaultWeight := s.getCategoryDefaultWeight(product.Category.Name)
	fmt.Printf("🔥 SHIPPING DEBUG: Using category default weight: %.2f kg\n", defaultWeight)
	return defaultWeight
}

func (s *ShippingService) getProductLength(product *domain.Product) float64 {
	// 1. Product-specific shipping length (highest priority)
	if product.ShippingLengthCm > 0 {
		return product.ShippingLengthCm
	}

	// 2. General product length
	if product.Length > 0 {
		return product.Length
	}

	// 3. Subcategory default length
	if product.SubCategory.DefaultLength > 0 {
		fmt.Printf("🔥 SHIPPING DEBUG: Using subcategory default length: %.2f cm\n", product.SubCategory.DefaultLength)
		return product.SubCategory.DefaultLength
	}

	// 4. Category-based default length
	defaultLength := s.getCategoryDefaultLength(product.Category.Name)
	fmt.Printf("🔥 SHIPPING DEBUG: Using category default length: %.2f cm\n", defaultLength)
	return defaultLength
}

func (s *ShippingService) getProductWidth(product *domain.Product) float64 {
	// 1. Product-specific shipping width (highest priority)
	if product.ShippingWidthCm > 0 {
		return product.ShippingWidthCm
	}

	// 2. General product width
	if product.Width > 0 {
		return product.Width
	}

	// 3. Subcategory default width
	if product.SubCategory.DefaultWidth > 0 {
		fmt.Printf("🔥 SHIPPING DEBUG: Using subcategory default width: %.2f cm\n", product.SubCategory.DefaultWidth)
		return product.SubCategory.DefaultWidth
	}

	// 4. Category-based default width
	defaultWidth := s.getCategoryDefaultWidth(product.Category.Name)
	fmt.Printf("🔥 SHIPPING DEBUG: Using category default width: %.2f cm\n", defaultWidth)
	return defaultWidth
}

func (s *ShippingService) getProductHeight(product *domain.Product) float64 {
	// 1. Product-specific shipping height (highest priority)
	if product.ShippingHeightCm > 0 {
		return product.ShippingHeightCm
	}

	// 2. General product height
	if product.Height > 0 {
		return product.Height
	}

	// 3. Subcategory default height
	if product.SubCategory.DefaultHeight > 0 {
		fmt.Printf("🔥 SHIPPING DEBUG: Using subcategory default height: %.2f cm\n", product.SubCategory.DefaultHeight)
		return product.SubCategory.DefaultHeight
	}

	// 4. Category-based default height
	defaultHeight := s.getCategoryDefaultHeight(product.Category.Name)
	fmt.Printf("🔥 SHIPPING DEBUG: Using category default height: %.2f cm\n", defaultHeight)
	return defaultHeight
}

// Category-based default dimensions for fallback
func (s *ShippingService) getCategoryDefaultWeight(categoryName string) float64 {
	categoryDefaults := map[string]float64{
		"Men's Fashion":          0.35,
		"Women's Fashion":        0.35,
		"Kids Fashion":           0.35,
		"Beauty & Personal Care": 0.25,
		"Home & Living":          2.00,
		"Food & Beverages":       1.50,
		"Gadgets":                0.50,
		"Electronics":            1.50,
		"Auto & Accessories":     1.50,
		"Books & Educational":    0.80,
		"Sports & Outdoor":       2.50,
		"Music & Entertainment":  3.00,
		"Other":                  1.00,
	}

	if weight, exists := categoryDefaults[categoryName]; exists {
		return weight
	}
	return 1.5 // Default fallback
}

func (s *ShippingService) getCategoryDefaultLength(categoryName string) float64 {
	categoryDefaults := map[string]float64{
		"Men's Fashion":          30,
		"Women's Fashion":        30,
		"Kids Fashion":           30,
		"Beauty & Personal Care": 18,
		"Home & Living":          50,
		"Food & Beverages":       25,
		"Gadgets":                20,
		"Electronics":            35,
		"Auto & Accessories":     30,
		"Books & Educational":    25,
		"Sports & Outdoor":       50,
		"Music & Entertainment":  80,
		"Other":                  30,
	}

	if length, exists := categoryDefaults[categoryName]; exists {
		return length
	}
	return 30.0 // Default fallback
}

func (s *ShippingService) getCategoryDefaultWidth(categoryName string) float64 {
	categoryDefaults := map[string]float64{
		"Men's Fashion":          25,
		"Women's Fashion":        25,
		"Kids Fashion":           25,
		"Beauty & Personal Care": 13,
		"Home & Living":          40,
		"Food & Beverages":       20,
		"Gadgets":                15,
		"Electronics":            25,
		"Auto & Accessories":     25,
		"Books & Educational":    20,
		"Sports & Outdoor":       40,
		"Music & Entertainment":  40,
		"Other":                  25,
	}

	if width, exists := categoryDefaults[categoryName]; exists {
		return width
	}
	return 25.0 // Default fallback
}

func (s *ShippingService) getCategoryDefaultHeight(categoryName string) float64 {
	categoryDefaults := map[string]float64{
		"Men's Fashion":          3,
		"Women's Fashion":        3,
		"Kids Fashion":           3,
		"Beauty & Personal Care": 8,
		"Home & Living":          15,
		"Food & Beverages":       12,
		"Gadgets":                8,
		"Electronics":            15,
		"Auto & Accessories":     15,
		"Books & Educational":    8,
		"Sports & Outdoor":       25,
		"Music & Entertainment":  30,
		"Other":                  15,
	}

	if height, exists := categoryDefaults[categoryName]; exists {
		return height
	}
	return 10.0 // Default fallback
}

// ValidateBusinessAddress validates a business address with Shipbubble and returns the address code
// Uses the business owner's name (not business name) as required by Shipbubble
func (s *ShippingService) ValidateBusinessAddress(ownerFirstName, ownerLastName, email, phone, address string) (int, error) {
	fullName := fmt.Sprintf("%s %s", ownerFirstName, ownerLastName)
	shipbubbleData, err := s.shipbubbleService.ValidateAddress(shipping.ShipbubbleAddressInfo{
		Email:   email,
		Phone:   phone,
		Name:    fullName,
		Address: address,
	})
	if err != nil {
		logger.Error("Failed to validate business address with Shipbubble: " + err.Error())
		return 0, fmt.Errorf("address validation failed: %w", err)
	}

	fmt.Printf("🔥 SHIPBUBBLE DEBUG: Business address validated successfully. Address code: %d\n", shipbubbleData.AddressCode)
	return shipbubbleData.AddressCode, nil
}
