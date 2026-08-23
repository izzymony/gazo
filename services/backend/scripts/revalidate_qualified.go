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
	ID                    string `gorm:"column:id"`
	AddressLine           string `gorm:"column:address_line"`
	Area                  string `gorm:"column:area"`
	Country               string `gorm:"column:country"`
	ShipbubbleAddressCode int    `gorm:"column:shipbubble_address_code"`
	BusinessID            string `gorm:"column:business_id"`
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
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: No .env file found")
	}

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN environment variable not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	apiKey := os.Getenv("SHIPBUBBLE_API_KEY_PROD")
	if apiKey == "" {
		log.Fatal("SHIPBUBBLE_API_KEY_PROD environment variable not set")
	}

	apiURL := os.Getenv("SHIPBUBBLE_API_URL")
	if apiURL == "" {
		apiURL = "https://api.shipbubble.com/v1"
	}

	// Fetch businesses that have valid owner names (both firstname AND lastname)
	var addresses []BusinessAddress
	err = db.Raw(`
		SELECT ba.* 
		FROM business_addresses ba
		JOIN businesses b ON b.id = ba.business_id
		JOIN users u ON u.id = b.user_id
		WHERE (ba.shipbubble_address_code = 0 OR ba.shipbubble_address_code IN (32235981, 816281312, 18266419, 726663019, 169476992))
		AND u.lastname IS NOT NULL 
		AND u.lastname != ''
		ORDER BY b.name
	`).Scan(&addresses).Error

	if err != nil {
		log.Fatalf("Failed to fetch addresses: %v", err)
	}

	fmt.Printf("Found %d qualified business addresses to revalidate\n\n", len(addresses))

	success := 0
	failed := 0

	for i, addr := range addresses {
		fmt.Printf("[%d/%d] Processing address: %s\n", i+1, len(addresses), addr.ID)

		var business Business
		err = db.Table("businesses").Where("id = ?", addr.BusinessID).First(&business).Error
		if err != nil {
			log.Printf("  ❌ Failed to fetch business: %v\n", err)
			failed++
			continue
		}

		var user User
		err = db.Table("users").Where("id = ?", business.UserID).First(&user).Error
		if err != nil {
			log.Printf("  ❌ Failed to fetch user: %v\n", err)
			failed++
			continue
		}

		ownerFullName := fmt.Sprintf("%s %s", user.Firstname, user.Lastname)
		fmt.Printf("  Business: %s (Owner: %s)\n", business.Name, ownerFullName)

		requestData := ValidateAddressRequest{
			Phone:   business.Phone,
			Email:   business.Email,
			Name:    ownerFullName,
			Address: fmt.Sprintf("%s, %s, %s", addr.AddressLine, addr.Area, addr.Country),
		}

		jsonData, err := json.Marshal(requestData)
		if err != nil {
			log.Printf("  ❌ Failed to marshal request: %v\n", err)
			failed++
			continue
		}

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
			log.Printf("  ❌ Failed to call API: %v\n", err)
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
			log.Printf("  ❌ API returned status %d: %s\n", resp.StatusCode, string(body))
			failed++
			continue
		}

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

		err = db.Table("business_addresses").
			Where("id = ?", addr.ID).
			Update("shipbubble_address_code", validateResp.Data.AddressCode).Error
		if err != nil {
			log.Printf("  ❌ Failed to update database: %v\n", err)
			failed++
			continue
		}

		fmt.Printf("  ✅ Updated: %d → %d\n\n", addr.ShipbubbleAddressCode, validateResp.Data.AddressCode)
		success++
	}

	fmt.Println("=======================================")
	fmt.Println("SUMMARY")
	fmt.Println("=======================================")
	fmt.Printf("Total addresses: %d\n", len(addresses))
	fmt.Printf("Successfully updated: %d\n", success)
	fmt.Printf("Failed: %d\n", failed)
	fmt.Println("=======================================")
}