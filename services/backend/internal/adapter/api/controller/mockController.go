package controller

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/requests"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/services"
)

type MockController struct{}

func NewMockController() *MockController {
	return &MockController{}
}

// MockShippingAddressValidate mocks the Shipbubble address validation endpoint
func (m *MockController) MockShippingAddressValidate(c *gin.Context) {
	// Simulate processing delay
	time.Sleep(200 * time.Millisecond)

	// Mock successful address validation response
	response := gin.H{
		"status":  "success",
		"message": "Address validated successfully",
		"data": gin.H{
			"address_code":      rand.Intn(999999) + 100000, // Random 6-digit code
			"address":           "Test Address for Local Development",
			"name":              "Test User",
			"email":             "test@example.com",
			"street_no":         "123",
			"street":            "Test Street",
			"phone":             "+2348123456789",
			"formatted_address": "123 Test Street, Test Town, Test State, Nigeria",
			"country":           "Nigeria",
			"country_code":      "NG",
			"city":              "Test Town",
			"city_code":         "TT",
			"state":             "Test State",
			"state_code":        "TS",
			"postal_code":       "100001",
			"latitude":          6.5244,
			"longitude":         3.3792,
		},
	}

	c.JSON(http.StatusOK, response)
}

// MockShippingFetchRates mocks the Shipbubble fetch shipping rates endpoint
func (m *MockController) MockShippingFetchRates(c *gin.Context) {
	// Simulate processing delay
	time.Sleep(500 * time.Millisecond)

	// Mock shipping rates response with multiple courier options
	response := gin.H{
		"status":  "success",
		"message": "Shipping rates fetched successfully",
		"data": gin.H{
			"request_token": "mock_request_token_" + time.Now().Format("20060102150405"),
			"couriers": []gin.H{
				// GIG Logistics — cheapest, COD available, mid tracking.
				{"courier_id": "GIGL_NG", "courier_name": "GIG Logistics", "courier_image": "https://logo.clearbit.com/giglogistics.com", "service_code": "GIGL_STD", "rate_card_amount": 1200, "currency": "NGN", "service_type": "dropoff", "delivery_eta": "3-5 days", "delivery_eta_time": "Delivered in 3-5 business days", "on_demand": false, "is_cod_available": true, "tracking_level": 2, "ratings": 4.3, "insurance": gin.H{"code": "INS-GIGL", "fee": 50}, "discount": gin.H{"percentage": 0.0, "symbol": "NGN", "discounted": 0.0}},
				// Fez Delivery — NO logo (exercises logo fallback), low tracking.
				{"courier_id": "FEZ_NG", "courier_name": "Fez Delivery", "courier_image": "", "service_code": "FEZ_STD", "rate_card_amount": 1500, "currency": "NGN", "service_type": "pickup", "delivery_eta": "2-4 days", "delivery_eta_time": "Delivered in 2-4 business days", "on_demand": false, "is_cod_available": false, "tracking_level": 1, "ratings": 4.0, "insurance": gin.H{"code": "INS-FEZ", "fee": 40}, "discount": gin.H{"percentage": 0.0, "symbol": "NGN", "discounted": 0.0}},
				// Sendbox — COD available, full tracking.
				{"courier_id": "SNDBX_NG", "courier_name": "Sendbox", "courier_image": "https://logo.clearbit.com/sendbox.co", "service_code": "SNDBX_STD", "rate_card_amount": 1800, "currency": "NGN", "service_type": "dropoff", "delivery_eta": "2-3 days", "delivery_eta_time": "Delivered in 2-3 business days", "on_demand": false, "is_cod_available": true, "tracking_level": 3, "ratings": 4.5, "insurance": gin.H{"code": "INS-SNDBX", "fee": 80}, "discount": gin.H{"percentage": 0.0, "symbol": "NGN", "discounted": 0.0}},
				// DHL Express — DISCOUNTED 3000 -> 2400 (exercises strike-through), full tracking.
				{"courier_id": "DHL_NG", "courier_name": "DHL Express", "courier_image": "https://logo.clearbit.com/dhl.com", "service_code": "DHL_EXP", "rate_card_amount": 3000, "currency": "NGN", "service_type": "pickup", "delivery_eta": "1-2 days", "delivery_eta_time": "Delivered in 1-2 business days", "on_demand": false, "is_cod_available": false, "tracking_level": 3, "ratings": 4.8, "insurance": gin.H{"code": "INS-DHL", "fee": 200}, "discount": gin.H{"percentage": 20.0, "symbol": "NGN", "discounted": 2400.0}},
				// Kwik Delivery — SAME-DAY on_demand (exercises the speed tag).
				{"courier_id": "KWIK_NG", "courier_name": "Kwik Delivery", "courier_image": "https://logo.clearbit.com/kwik.delivery", "service_code": "KWIK_SAMEDAY", "rate_card_amount": 2500, "currency": "NGN", "service_type": "pickup", "delivery_eta": "Same day", "delivery_eta_time": "Delivered within hours", "on_demand": true, "is_cod_available": false, "tracking_level": 3, "ratings": 4.6, "insurance": gin.H{"code": "INS-KWIK", "fee": 150}, "discount": gin.H{"percentage": 0.0, "symbol": "NGN", "discounted": 0.0}},
			},
			"fastest_courier":  gin.H{"courier_id": "KWIK_NG", "courier_name": "Kwik Delivery", "delivery_eta_time": "Delivered within hours"},
			"cheapest_courier": gin.H{"courier_id": "GIGL_NG", "courier_name": "GIG Logistics", "rate_card_amount": 1200},
			"checkout_data": gin.H{
				"ship_from": gin.H{
					"name":    "Test Store",
					"phone":   "+2348123456789",
					"email":   "store@example.com",
					"address": "Test Store Address, Lagos, Nigeria",
				},
				"ship_to": gin.H{
					"name":    "Test Customer",
					"phone":   "+2348987654321",
					"email":   "customer@example.com",
					"address": "Customer Address, Test Town, Nigeria",
				},
				"package_amount": 15000,
				"package_weight": 2.5,
				"pickup_time":    time.Now().Add(24 * time.Hour).Format("2006-01-02"),
			},
		},
	}

	c.JSON(http.StatusOK, response)
}

// MockShippingCreateShipment mocks the Shipbubble create shipment endpoint
func (m *MockController) MockShippingCreateShipment(c *gin.Context) {
	// Simulate processing delay
	time.Sleep(300 * time.Millisecond)

	// Mock shipment creation response
	response := gin.H{
		"status":  "success",
		"message": "Shipment created successfully",
		"data": gin.H{
			"order_id": "MOCK_" + time.Now().Format("20060102150405"),
			"courier": gin.H{
				"name":  "Express Delivery",
				"email": "courier@express.com",
				"phone": "+2348123456789",
			},
			"status": "processing",
			"ship_from": gin.H{
				"name":      "Test Store",
				"phone":     "+2348123456789",
				"email":     "store@example.com",
				"address":   "Test Store Address, Lagos, Nigeria",
				"latitude":  6.5244,
				"longitude": 3.3792,
			},
			"ship_to": gin.H{
				"name":      "Test Customer",
				"phone":     "+2348987654321",
				"email":     "customer@example.com",
				"address":   "Customer Address, Test Town, Nigeria",
				"latitude":  6.4474,
				"longitude": 3.3903,
			},
			"payment": gin.H{
				"shipping_fee": 2500,
				"type":         "prepaid",
				"status":       "paid",
				"currency":     "NGN",
			},
			"items": []gin.H{
				{
					"name":        "Test Product",
					"description": "Test product for local development",
					"weight":      2.5,
					"amount":      15000,
					"quantity":    1,
					"total":       15000,
				},
			},
			"tracking_url": "https://mock-tracking.example.com/track/MOCK_" + time.Now().Format("20060102150405"),
			"date":         time.Now().Format("2006-01-02 15:04:05"),
		},
	}

	c.JSON(http.StatusOK, response)
}

// MockWebhookSimulator simulates Shipbubble webhook events for local testing
func (m *MockController) MockWebhookSimulator(c *gin.Context) {
	var request struct {
		OrderID string `json:"order_id" binding:"required"`
		Status  string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("🔥 MOCK WEBHOOK: Simulating status update for OrderID=%s, Status=%s\n", request.OrderID, request.Status)

	// Create mock webhook payload that matches Shipbubble's structure
	webhookPayload := requests.ShipbubbleWebhookRequest{
		Event:   "status_update",
		OrderID: request.OrderID,
		Status:  request.Status,
		Courier: struct {
			Name            string  `json:"name"`
			Email           string  `json:"email"`
			Phone           string  `json:"phone"`
			TrackingCode    string  `json:"tracking_code"`
			TrackingMessage string  `json:"tracking_message"`
			RiderInfo       *string `json:"rider_info"`
		}{
			Name:            "Mock Express Courier",
			Email:           "courier@mockexpress.com",
			Phone:           "+2348123456789",
			TrackingCode:    "TRACK_" + time.Now().Format("20060102150405"),
			TrackingMessage: getTrackingMessage(request.Status),
			RiderInfo:       nil,
		},
		ShipFrom: struct {
			Name    string `json:"name"`
			Phone   string `json:"phone"`
			Email   string `json:"email"`
			Address string `json:"address"`
		}{
			Name:    "Test Store",
			Phone:   "+2348123456789",
			Email:   "store@teststore.com",
			Address: "Test Store Address, Lagos, Nigeria",
		},
		ShipTo: struct {
			Name    string `json:"name"`
			Phone   string `json:"phone"`
			Email   string `json:"email"`
			Address string `json:"address"`
		}{
			Name:    "Test Customer",
			Phone:   "+2348987654321",
			Email:   "customer@testmail.com",
			Address: "Customer Address, Test Town, Nigeria",
		},
		ToBeProcessed: time.Now(),
		Payment: struct {
			ShippingFee int    `json:"shipping_fee"`
			Currency    string `json:"currency"`
		}{
			ShippingFee: 2500,
			Currency:    "NGN",
		},
		PackageStatus: []struct {
			Status   string    `json:"status"`
			Datetime time.Time `json:"datetime"`
		}{
			{
				Status:   request.Status,
				Datetime: time.Now(),
			},
		},
		TrackingURL: "https://mock-tracking.example.com/track/" + request.OrderID,
		Date:        time.Now(),
	}

	// Get database connection from context (injected by middleware)
	db, exists := c.Get("db")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database connection not available"})
		return
	}

	// Process through webhook service directly (bypasses signature verification)
	webhookService := services.NewWebhookService(db.(*gorm.DB))
	err := webhookService.ShipbubbleWebhook(webhookPayload)

	if err != nil {
		fmt.Printf("🔥 MOCK WEBHOOK ERROR: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("✅ MOCK WEBHOOK: Successfully updated order status to %s\n", request.Status)
	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": fmt.Sprintf("Order %s status updated to %s", request.OrderID, request.Status),
		"data": gin.H{
			"order_id":         request.OrderID,
			"status":           request.Status,
			"tracking_message": getTrackingMessage(request.Status),
		},
	})
}

// Helper function to get appropriate tracking message for each status
func getTrackingMessage(status string) string {
	switch status {
	case "confirmed":
		return "Shipment confirmed. Rider is en route to pick up your package."
	case "picked_up":
		return "Package has been picked up and is now in transit."
	case "in_transit":
		return "Package is out for delivery. You should receive it soon."
	case "completed":
		return "Package has been successfully delivered."
	case "cancelled":
		return "Shipment has been cancelled."
	default:
		return "Package status updated."
	}
}
