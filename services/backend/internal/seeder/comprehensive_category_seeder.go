package seeder

import (
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

// CategoryData represents the complete category structure with Shipbubble mapping
type CategoryData struct {
	Name                string
	Description         string
	ShipbubbleCategoryId string
	ShipbubbleProviderId string
	Subcategories       []SubcategoryData
}

type SubcategoryData struct {
	Name                   string
	Description            string
	ShippingLengthCm      float64
	ShippingWidthCm       float64
	ShippingHeightCm      float64
	ShippingWeightKg      float64
	RequiresCustomShipping bool
}

// SeedComprehensiveCategories seeds all 13 main categories with 44 subcategories
func SeedComprehensiveCategories(db *gorm.DB) error {
	log.Println("🌱 Starting comprehensive category seeding...")

	categories := []CategoryData{
		{
			Name:                 "Men's Fashion",
			Description:          "Clothing, shoes, and accessories for men",
			ShipbubbleCategoryId: "74794423",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Clothing",
					Description:      "Men's shirts, pants, suits, and casual wear",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.35,
				},
				{
					Name:             "Shoes & Footwear",
					Description:      "Men's shoes, sneakers, boots, and sandals",
					ShippingLengthCm: 33,
					ShippingWidthCm:  22,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.00,
				},
				{
					Name:             "Bags & Accessories",
					Description:      "Men's bags, belts, wallets, and accessories",
					ShippingLengthCm: 35,
					ShippingWidthCm:  28,
					ShippingHeightCm: 10,
					ShippingWeightKg: 0.80,
				},
				{
					Name:             "Traditional & Cultural Wear",
					Description:      "Traditional Nigerian and cultural clothing for men",
					ShippingLengthCm: 35,
					ShippingWidthCm:  30,
					ShippingHeightCm: 5,
					ShippingWeightKg: 0.60,
				},
				{
					Name:             "Activewear",
					Description:      "Men's sportswear, gym clothes, and athletic wear",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.40,
				},
			},
		},
		{
			Name:                 "Women's Fashion",
			Description:          "Clothing, shoes, and accessories for women",
			ShipbubbleCategoryId: "74794423",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Clothing",
					Description:      "Women's dresses, tops, pants, and casual wear",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.35,
				},
				{
					Name:             "Shoes & Footwear",
					Description:      "Women's shoes, heels, sneakers, and sandals",
					ShippingLengthCm: 33,
					ShippingWidthCm:  22,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.00,
				},
				{
					Name:             "Bags & Accessories",
					Description:      "Women's handbags, purses, jewelry, and accessories",
					ShippingLengthCm: 35,
					ShippingWidthCm:  28,
					ShippingHeightCm: 10,
					ShippingWeightKg: 0.80,
				},
				{
					Name:             "Traditional & Cultural Wear",
					Description:      "Traditional Nigerian and cultural clothing for women",
					ShippingLengthCm: 35,
					ShippingWidthCm:  30,
					ShippingHeightCm: 5,
					ShippingWeightKg: 0.60,
				},
				{
					Name:             "Activewear",
					Description:      "Women's sportswear, yoga clothes, and athletic wear",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.40,
				},
			},
		},
		{
			Name:                 "Kids Fashion",
			Description:          "Clothing and accessories for children and babies",
			ShipbubbleCategoryId: "74794423",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Baby Clothing",
					Description:      "Clothing for infants and toddlers",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.35,
				},
				{
					Name:             "School Wear",
					Description:      "School uniforms and educational clothing",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.35,
				},
				{
					Name:             "Party Wear",
					Description:      "Special occasion and party clothing for kids",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 3,
					ShippingWeightKg: 0.35,
				},
				{
					Name:             "Shoes & Footwear",
					Description:      "Children's shoes, sneakers, and sandals",
					ShippingLengthCm: 33,
					ShippingWidthCm:  22,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.00,
				},
				{
					Name:             "Bags & Accessories",
					Description:      "School bags, backpacks, and kids accessories",
					ShippingLengthCm: 35,
					ShippingWidthCm:  28,
					ShippingHeightCm: 10,
					ShippingWeightKg: 0.80,
				},
				{
					Name:             "Traditional & Cultural Wear",
					Description:      "Traditional Nigerian clothing for children",
					ShippingLengthCm: 35,
					ShippingWidthCm:  30,
					ShippingHeightCm: 5,
					ShippingWeightKg: 0.60,
				},
			},
		},
		{
			Name:                 "Beauty & Personal Care",
			Description:          "Skincare, makeup, and personal care products",
			ShipbubbleCategoryId: "99652979",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Skincare",
					Description:      "Face care, moisturizers, cleansers, and treatments",
					ShippingLengthCm: 18,
					ShippingWidthCm:  13,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.25,
				},
				{
					Name:             "Makeup",
					Description:      "Cosmetics, foundation, lipstick, and beauty tools",
					ShippingLengthCm: 18,
					ShippingWidthCm:  13,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.25,
				},
				{
					Name:             "Haircare",
					Description:      "Shampoos, conditioners, and hair styling products",
					ShippingLengthCm: 20,
					ShippingWidthCm:  15,
					ShippingHeightCm: 10,
					ShippingWeightKg: 0.35,
				},
				{
					Name:             "Fragrances",
					Description:      "Perfumes, colognes, and body sprays",
					ShippingLengthCm: 18,
					ShippingWidthCm:  13,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.25,
				},
				{
					Name:             "Men's Grooming",
					Description:      "Men's skincare, shaving, and grooming products",
					ShippingLengthCm: 18,
					ShippingWidthCm:  13,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.25,
				},
				{
					Name:             "Personal Hygiene",
					Description:      "Body care, hygiene products, and wellness items",
					ShippingLengthCm: 20,
					ShippingWidthCm:  15,
					ShippingHeightCm: 10,
					ShippingWeightKg: 0.30,
				},
			},
		},
		{
			Name:                 "Home & Living",
			Description:          "Furniture, decor, and household items",
			ShipbubbleCategoryId: "25590994", // Default to furniture, will be smart-selected
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Furniture",
					Description:      "Tables, chairs, sofas, and large furniture items",
					ShippingLengthCm: 80,
					ShippingWidthCm:  60,
					ShippingHeightCm: 20,
					ShippingWeightKg: 12.00,
				},
				{
					Name:             "Home Decor",
					Description:      "Decorative items, artwork, and home accessories",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 10,
					ShippingWeightKg: 1.50,
				},
				{
					Name:             "Kitchen & Dining",
					Description:      "Kitchenware, cookware, and dining accessories",
					ShippingLengthCm: 35,
					ShippingWidthCm:  30,
					ShippingHeightCm: 15,
					ShippingWeightKg: 2.00,
				},
				{
					Name:             "Storage & Organization",
					Description:      "Storage solutions and organizational products",
					ShippingLengthCm: 40,
					ShippingWidthCm:  35,
					ShippingHeightCm: 15,
					ShippingWeightKg: 1.80,
				},
			},
		},
		{
			Name:                 "Food & Beverages",
			Description:          "Food items, snacks, and beverages",
			ShipbubbleCategoryId: "24032950", // Default to dry food, will be smart-selected
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Snacks & Confectioneries",
					Description:      "Snacks, candies, chocolates, and treats",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.20,
				},
				{
					Name:             "Groceries",
					Description:      "Fresh groceries, produce, and everyday food items",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 15,
					ShippingWeightKg: 2.00,
				},
				{
					Name:             "Beverages",
					Description:      "Drinks, juices, water, and beverage products",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 15,
					ShippingWeightKg: 2.50,
				},
				{
					Name:             "Health Foods",
					Description:      "Organic foods, supplements, and health products",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.00,
				},
				{
					Name:             "Meal Prep & Ready-to-Eat",
					Description:      "Prepared meals and ready-to-eat food items",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 10,
					ShippingWeightKg: 1.50,
				},
			},
		},
		{
			Name:                 "Gadgets",
			Description:          "Small electronic devices and tech accessories",
			ShipbubbleCategoryId: "77179563",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Phone Accessories",
					Description:      "Cases, chargers, cables, and phone accessories",
					ShippingLengthCm: 20,
					ShippingWidthCm:  15,
					ShippingHeightCm: 5,
					ShippingWeightKg: 0.30,
				},
				{
					Name:             "Wearable Technology",
					Description:      "Smart watches, fitness trackers, and wearables",
					ShippingLengthCm: 18,
					ShippingWidthCm:  13,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.25,
				},
				{
					Name:             "Small Electronics",
					Description:      "Portable gadgets and small electronic devices",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 10,
					ShippingWeightKg: 0.80,
				},
			},
		},
		{
			Name:                 "Electronics",
			Description:          "Large electronics, computers, and tech equipment",
			ShipbubbleCategoryId: "77179563",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Mobile Phones & Accessories",
					Description:      "Smartphones, tablets, and mobile accessories",
					ShippingLengthCm: 20,
					ShippingWidthCm:  15,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.50,
				},
				{
					Name:             "Computers & Laptops",
					Description:      "Laptops, desktops, and computer accessories",
					ShippingLengthCm: 45,
					ShippingWidthCm:  35,
					ShippingHeightCm: 15,
					ShippingWeightKg: 3.50,
				},
				{
					Name:             "Audio & Headphones",
					Description:      "Headphones, speakers, and audio equipment",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.00,
				},
				{
					Name:             "Gaming & Console",
					Description:      "Gaming consoles, controllers, and gaming accessories",
					ShippingLengthCm: 40,
					ShippingWidthCm:  30,
					ShippingHeightCm: 20,
					ShippingWeightKg: 2.50,
				},
				{
					Name:             "Smart Home & IoT",
					Description:      "Smart home devices and IoT products",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 10,
					ShippingWeightKg: 1.20,
				},
				{
					Name:             "Cameras & Photography",
					Description:      "Cameras, lenses, and photography equipment",
					ShippingLengthCm: 35,
					ShippingWidthCm:  28,
					ShippingHeightCm: 15,
					ShippingWeightKg: 2.00,
				},
			},
		},
		{
			Name:                 "Auto & Accessories",
			Description:          "Automotive parts, accessories, and car care products",
			ShipbubbleCategoryId: "20754594", // Default to light items, will be smart-selected
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Car Care & Maintenance",
					Description:      "Car cleaning products, oils, and maintenance items",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 12,
					ShippingWeightKg: 1.50,
				},
				{
					Name:             "Auto Parts & Tools",
					Description:      "Car parts, tools, and mechanical accessories",
					ShippingLengthCm: 40,
					ShippingWidthCm:  30,
					ShippingHeightCm: 20,
					ShippingWeightKg: 3.00,
				},
				{
					Name:             "Auto Accessories",
					Description:      "Car accessories, interior items, and decorative products",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 15,
					ShippingWeightKg: 1.20,
				},
			},
		},
		{
			Name:                 "Books & Educational",
			Description:          "Books, educational materials, and stationery",
			ShipbubbleCategoryId: "20754594",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Books & Novels",
					Description:      "Fiction, non-fiction, educational, and reference books",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.80,
				},
				{
					Name:             "Educational Supplies",
					Description:      "School supplies, learning materials, and educational tools",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 10,
					ShippingWeightKg: 1.00,
				},
				{
					Name:             "Office & Stationery",
					Description:      "Office supplies, writing materials, and stationery items",
					ShippingLengthCm: 25,
					ShippingWidthCm:  20,
					ShippingHeightCm: 8,
					ShippingWeightKg: 0.60,
				},
			},
		},
		{
			Name:                 "Sports & Outdoor",
			Description:          "Sports equipment, fitness gear, and outdoor activities",
			ShipbubbleCategoryId: "20754594", // Default to light items, will be smart-selected for equipment
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Fitness Equipment",
					Description:      "Exercise equipment, weights, and fitness accessories",
					ShippingLengthCm: 50,
					ShippingWidthCm:  40,
					ShippingHeightCm: 25,
					ShippingWeightKg: 5.00,
				},
				{
					Name:             "Outdoor Gear",
					Description:      "Camping, hiking, and outdoor adventure equipment",
					ShippingLengthCm: 40,
					ShippingWidthCm:  35,
					ShippingHeightCm: 20,
					ShippingWeightKg: 2.50,
				},
				{
					Name:             "Cycling & Bicycles",
					Description:      "Bicycles, cycling accessories, and bike maintenance",
					ShippingLengthCm: 150,
					ShippingWidthCm:  80,
					ShippingHeightCm: 50,
					ShippingWeightKg: 15.00,
				},
			},
		},
		{
			Name:                 "Music & Entertainment",
			Description:          "Musical instruments, entertainment equipment, and media",
			ShipbubbleCategoryId: "20754594", // Default to light items, will be smart-selected
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Musical Instruments",
					Description:      "Guitars, keyboards, drums, and musical instruments",
					ShippingLengthCm: 100,
					ShippingWidthCm:  40,
					ShippingHeightCm: 30,
					ShippingWeightKg: 3.00,
				},
				{
					Name:             "Concert & DJ Equipment",
					Description:      "Professional audio equipment and DJ gear",
					ShippingLengthCm: 60,
					ShippingWidthCm:  45,
					ShippingHeightCm: 25,
					ShippingWeightKg: 8.00,
				},
			},
		},
		{
			Name:                 "Other",
			Description:          "Miscellaneous items and products not fitting other categories",
			ShipbubbleCategoryId: "20754594",
			ShipbubbleProviderId: "shipbubble",
			Subcategories: []SubcategoryData{
				{
					Name:             "Miscellaneous",
					Description:      "General items requiring custom shipping configuration",
					ShippingLengthCm: 30,
					ShippingWidthCm:  25,
					ShippingHeightCm: 15,
					ShippingWeightKg: 1.00,
					RequiresCustomShipping: true,
				},
			},
		},
	}

	// Create or update categories and subcategories
	for _, categoryData := range categories {
		category, err := createOrUpdateCategory(db, categoryData)
		if err != nil {
			log.Printf("❌ Failed to create/update category '%s': %v", categoryData.Name, err)
			continue
		}

		log.Printf("✅ Created/updated category: %s (ID: %s)", category.Name, category.ID)

		// Create subcategories
		for _, subcatData := range categoryData.Subcategories {
			subcat, err := createOrUpdateSubcategory(db, subcatData, category.ID)
			if err != nil {
				log.Printf("❌ Failed to create/update subcategory '%s': %v", subcatData.Name, err)
				continue
			}
			log.Printf("   ✅ Created/updated subcategory: %s (ID: %s)", subcat.Name, subcat.ID)
		}
	}

	// Update external categories with new Shipbubble mappings
	err := seedShipbubbleCategories(db)
	if err != nil {
		log.Printf("❌ Failed to seed Shipbubble categories: %v", err)
		return err
	}

	log.Println("🎉 Comprehensive category seeding completed successfully!")
	return nil
}

// findExternalCategoryUUIDByProviderId looks up the UUID from external_categories table
// using the provider_id (Shipbubble's ID)
func findExternalCategoryUUIDByProviderId(db *gorm.DB, providerId string) (string, error) {
	var externalCategory domain.ExternalCategory
	err := db.Where("provider_id = ?", providerId).First(&externalCategory).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If not found, return empty string (will be handled by caller)
			return "", nil
		}
		return "", fmt.Errorf("error looking up external category: %v", err)
	}
	return externalCategory.ID, nil
}

// createOrUpdateCategory creates or updates a category
func createOrUpdateCategory(db *gorm.DB, categoryData CategoryData) (*domain.Category, error) {
	slug := generateSlug(categoryData.Name)

	// Lookup the proper UUID from external_categories table
	// ShipbubbleCategoryId contains the provider_id, but we need the UUID
	externalCategoryUUID, err := findExternalCategoryUUIDByProviderId(db, categoryData.ShipbubbleCategoryId)
	if err != nil {
		log.Printf("⚠️  Warning: Could not lookup external category UUID for provider_id %s: %v", categoryData.ShipbubbleCategoryId, err)
		// Continue without external category ID
		externalCategoryUUID = ""
	}

	var category domain.Category
	err = db.Where("name = ? OR slug = ?", categoryData.Name, slug).First(&category).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new category
			category = domain.Category{
				Name:               categoryData.Name,
				Description:        &categoryData.Description,
				Slug:               &slug,
				Status:             "active",
				ExternalCategoryId: externalCategoryUUID, // Now using UUID instead of provider_id
			}

			err = db.Create(&category).Error
			if err != nil {
				return nil, fmt.Errorf("failed to create category: %v", err)
			}
		} else {
			return nil, fmt.Errorf("database error: %v", err)
		}
	} else {
		// Update existing category
		category.Description = &categoryData.Description
		category.ExternalCategoryId = externalCategoryUUID // Now using UUID instead of provider_id
		category.Status = "active"

		err = db.Save(&category).Error
		if err != nil {
			return nil, fmt.Errorf("failed to update category: %v", err)
		}
	}

	return &category, nil
}

// createOrUpdateSubcategory creates or updates a subcategory
func createOrUpdateSubcategory(db *gorm.DB, subcatData SubcategoryData, categoryId string) (*domain.SubCategory, error) {
	slug := generateSlug(subcatData.Name)
	
	var subcategory domain.SubCategory
	err := db.Where("name = ? AND category_id = ?", subcatData.Name, categoryId).First(&subcategory).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new subcategory
			subcategory = domain.SubCategory{
				Name:          subcatData.Name,
				Description:   &subcatData.Description,
				Slug:          &slug,
				Status:        "active",
				CategoryId:    categoryId,
				DefaultLength: subcatData.ShippingLengthCm,
				DefaultWidth:  subcatData.ShippingWidthCm,
				DefaultHeight: subcatData.ShippingHeightCm,
				DefaultWeight: subcatData.ShippingWeightKg,
			}
			
			err = db.Create(&subcategory).Error
			if err != nil {
				return nil, fmt.Errorf("failed to create subcategory: %v", err)
			}
		} else {
			return nil, fmt.Errorf("database error: %v", err)
		}
	} else {
		// Update existing subcategory with new shipping defaults
		subcategory.Description = &subcatData.Description
		subcategory.DefaultLength = subcatData.ShippingLengthCm
		subcategory.DefaultWidth = subcatData.ShippingWidthCm
		subcategory.DefaultHeight = subcatData.ShippingHeightCm
		subcategory.DefaultWeight = subcatData.ShippingWeightKg
		subcategory.Status = "active"
		
		err = db.Save(&subcategory).Error
		if err != nil {
			return nil, fmt.Errorf("failed to update subcategory: %v", err)
		}
	}
	
	return &subcategory, nil
}

// seedShipbubbleCategories updates the external categories with proper Shipbubble mappings
func seedShipbubbleCategories(db *gorm.DB) error {
	// Enhanced Shipbubble categories with comprehensive mapping
	shipbubbleCategories := []domain.ExternalCategory{
		{Name: "Fashion wears", Provider: "shipbubble", ProviderId: "74794423"},
		{Name: "Health and beauty", Provider: "shipbubble", ProviderId: "99652979"},
		{Name: "Furniture and fittings", Provider: "shipbubble", ProviderId: "25590994"},
		{Name: "Light weight items", Provider: "shipbubble", ProviderId: "20754594"},
		{Name: "Hot food", Provider: "shipbubble", ProviderId: "98190590"},
		{Name: "Dry food and supplements", Provider: "shipbubble", ProviderId: "24032950"},
		{Name: "Groceries", Provider: "shipbubble", ProviderId: "2178251"},
		{Name: "Electronics and gadgets", Provider: "shipbubble", ProviderId: "77179563"},
		{Name: "Machinery", Provider: "shipbubble", ProviderId: "67008831"},
		{Name: "Medical supplies", Provider: "shipbubble", ProviderId: "57487393"},
		{Name: "Sensitive items (ATM cards, documents)", Provider: "shipbubble", ProviderId: "67658572"},
	}

	for _, extCategory := range shipbubbleCategories {
		var existing domain.ExternalCategory
		err := db.Where("provider_id = ? AND provider = ?", extCategory.ProviderId, "shipbubble").First(&existing).Error
		
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Create new external category
				err = db.Create(&extCategory).Error
				if err != nil {
					log.Printf("❌ Failed to create external category '%s': %v", extCategory.Name, err)
					continue
				}
				log.Printf("✅ Created external category: %s (ID: %s)", extCategory.Name, extCategory.ProviderId)
			} else {
				log.Printf("❌ Database error for external category '%s': %v", extCategory.Name, err)
				continue
			}
		} else {
			// Update existing external category
			existing.Name = extCategory.Name
			err = db.Save(&existing).Error
			if err != nil {
				log.Printf("❌ Failed to update external category '%s': %v", extCategory.Name, err)
				continue
			}
			log.Printf("✅ Updated external category: %s (ID: %s)", existing.Name, existing.ProviderId)
		}
	}

	return nil
}

// generateSlug creates a URL-friendly slug from a name
func generateSlug(name string) string {
	// Convert to lowercase
	slug := strings.ToLower(name)
	// Replace spaces and special characters with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "&", "and")
	slug = strings.ReplaceAll(slug, "'", "")
	// Remove any remaining special characters (keep only alphanumeric and hyphens)
	result := ""
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result += string(r)
		}
	}
	// Remove multiple consecutive hyphens
	for strings.Contains(result, "--") {
		result = strings.ReplaceAll(result, "--", "-")
	}
	// Trim hyphens from start and end
	result = strings.Trim(result, "-")
	return result
}