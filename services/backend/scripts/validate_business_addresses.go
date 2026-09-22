//go:build ignore

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type BusinessAddress struct {
	ID                      string `gorm:"column:id"`
	AddressLine             string `gorm:"column:address_line"`
	Area                    string `gorm:"column:area"`
	Country                 string `gorm:"column:country"`
	ShipbubbleAddressCode   int    `gorm:"column:shipbubble_address_code"`
	BusinessID              string `gorm:"column:business_id"`
}

type Business struct {
	ID     string `gorm:"column:id"`
	Name   string `gorm:"column:name"`
	Email  string `gorm:"column:email"`
	Phone  string `gorm:"column:phone"`
	UserID string `gorm:"column:user_id"`
}

type User struct {
	ID        string `gorm:"column:id"`
	Firstname string `gorm:"column:firstname"`
	Lastname  string `gorm:"column:lastname"`
	Email     string `gorm:"column:email"`
	Phone     string `gorm:"column:phone"`
}

type ValidateAddressRequest struct {
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Address string `json:"address"`
}

type ValidateAddressResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    struct {
		AddressCode int    `json:"address_code"`
		Address     string `json:"address"`
		Name        string `json:"name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
	} `json:"data"`
}

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: No .env file found")
	}

	// Get database connection
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN environment variable not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Get Shipbubble API key
	apiKey := os.Getenv("SHIPBUBBLE_API_KEY_PROD")
	if apiKey == "" {
		log.Fatal("SHIPBUBBLE_API_KEY_PROD environment variable not set")
	}

	apiURL := os.Getenv("SHIPBUBBLE_API_URL")
	if apiURL == "" {
		apiURL = "https://api.shipbubble.com/v1"
	}

	// Fetch all business addresses with invalid or missing codes
	var addresses []BusinessAddress
	err = db.Table("business_addresses").
		Where("shipbubble_address_code = ? OR shipbubble_address_code IS NULL", 0).
		Find(&addresses).Error
	if err != nil {
		log.Fatalf("Failed to fetch business addresses: %v", err)
	}

	fmt.Printf("Found %d business addresses that need validation\n\n", len(addresses))

	updated := 0
	failed := 0

	for i, addr := range addresses {
		fmt.Printf("[%d/%d] Processing address: %s\n", i+1, len(addresses), addr.ID)

		// Get business details
		var business Business
		err = db.Table("businesses").Where("id = ?", addr.BusinessID).First(&business).Error
		if err != nil {
			log.Printf("  ❌ Failed to fetch business: %v\n", err)
			failed++
			continue
		}

		// Get business owner details for validation
		var user User
		err = db.Table("users").Where("id = ?", business.UserID).First(&user).Error
		if err != nil {
			log.Printf("  ❌ Failed to fetch business owner: %v\n", err)
			failed++
			continue
		}

		// Prepare validation request with owner's name (not business name)
		ownerFullName := fmt.Sprintf("%s %s", user.Firstname, user.Lastname)
		fmt.Printf("  Business: %s (Owner: %s)\n", business.Name, ownerFullName)

		requestData := ValidateAddressRequest{
			Phone:   business.Phone,
			Email:   business.Email,
			Name:    ownerFullName,  // Use owner's name instead of business name
			Address: fmt.Sprintf("%s, %s, %s", addr.AddressLine, addr.Area, addr.Country),
		}

		jsonData, err := json.Marshal(requestData)
		if err != nil {
			log.Printf("  ❌ Failed to marshal request: %v\n", err)
			failed++
			continue
		}

		// Call Shipbubble ValidateAddress API
		req, err := http.NewRequest("POST", apiURL+"/shipping/address/validate", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("  ❌ Failed to create request: %v\n", err)
			failed++
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+apiKey)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("  ❌ Failed to call Shipbubble API: %v\n", err)
			failed++
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Printf("  ❌ Failed to read response: %v\n", err)
			failed++
			continue
		}

		if resp.StatusCode != 200 {
			log.Printf("  ❌ API returned status %d (body withheld: it echoes the submitted address)", resp.StatusCode)
			failed++
			continue
		}

		// Parse response
		var validateResp ValidateAddressResponse
		err = json.Unmarshal(body, &validateResp)
		if err != nil {
			log.Printf("  ❌ Failed to parse response: %v\n", err)
			failed++
			continue
		}

		if validateResp.Status != "success" {
			log.Printf("  ❌ Validation failed: %s\n", validateResp.Message)
			failed++
			continue
		}

		// Update database with new address code
		err = db.Table("business_addresses").
			Where("id = ?", addr.ID).
			Update("shipbubble_address_code", validateResp.Data.AddressCode).Error
		if err != nil {
			log.Printf("  ❌ Failed to update database: %v\n", err)
			failed++
			continue
		}

		fmt.Printf("  ✅ Updated with address code: %d\n", validateResp.Data.AddressCode)
		updated++
	}

	fmt.Printf("\n" +
		"=======================================\n" +
		"SUMMARY\n" +
		"=======================================\n" +
		"Total addresses: %d\n" +
		"Successfully updated: %d\n" +
		"Failed: %d\n" +
		"=======================================\n",
		len(addresses), updated, failed)
}