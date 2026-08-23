package seeder

import (
	"log"
	"insta-api/internal/core/domain"
	"insta-api/internal/database"
	"golang.org/x/crypto/bcrypt"
)

// SeedRealisticData creates minimal realistic data for local testing
// This creates only essential data to test the application realistically
func SeedRealisticData() error {
	db := database.ConnectDB()
	
	log.Println("🌱 Starting realistic data seeding...")
	
	// Create essential categories first
	desc1, desc2, desc3, desc4, desc5 := "Electronic devices and accessories", "Clothing and fashion items", "Home and garden supplies", "Books and educational materials", "Food and drink items"
	icon1, icon2, icon3, icon4, icon5 := "📱", "👗", "🏠", "📚", "🍔"
	
	categories := []domain.Category{
		{Name: "Electronics", Description: &desc1, Icon: &icon1, Status: "active"},
		{Name: "Fashion", Description: &desc2, Icon: &icon2, Status: "active"},
		{Name: "Home & Garden", Description: &desc3, Icon: &icon3, Status: "active"},
		{Name: "Books", Description: &desc4, Icon: &icon4, Status: "active"},
		{Name: "Food & Beverages", Description: &desc5, Icon: &icon5, Status: "active"},
	}
	
	// Create categories and get their IDs for subcategories
	var createdCategories []domain.Category
	for _, cat := range categories {
		var existingCat domain.Category
		if err := db.Where("name = ?", cat.Name).First(&existingCat).Error; err != nil {
			// Category doesn't exist, create it
			if err := db.Create(&cat).Error; err != nil {
				log.Printf("Failed to create category %s: %v", cat.Name, err)
				continue
			}
			log.Printf("✅ Created category: %s", cat.Name)
			createdCategories = append(createdCategories, cat)
		} else {
			log.Printf("Category %s already exists", cat.Name)
			createdCategories = append(createdCategories, existingCat)
		}
	}

	// Create comprehensive subcategories
	subcategories := []domain.SubCategory{}
	
	// Find category IDs
	var electronics, fashion, homeGarden, books, foodBeverages domain.Category
	for _, cat := range createdCategories {
		switch cat.Name {
		case "Electronics":
			electronics = cat
		case "Fashion":
			fashion = cat
		case "Home & Garden":
			homeGarden = cat
		case "Books":
			books = cat
		case "Food & Beverages":
			foodBeverages = cat
		}
	}

	// Electronics subcategories
	if electronics.ID != "" {
		electronicsSubcats := []domain.SubCategory{
			{Name: "Mobile Phones & Accessories", CategoryId: electronics.ID, Status: "active", DefaultWeight: 0.3, DefaultLength: 15, DefaultWidth: 8, DefaultHeight: 1},
			{Name: "Computers & Laptops", CategoryId: electronics.ID, Status: "active", DefaultWeight: 2.5, DefaultLength: 35, DefaultWidth: 25, DefaultHeight: 3},
			{Name: "Audio & Headphones", CategoryId: electronics.ID, Status: "active", DefaultWeight: 0.5, DefaultLength: 20, DefaultWidth: 15, DefaultHeight: 8},
			{Name: "Gaming & Console", CategoryId: electronics.ID, Status: "active", DefaultWeight: 3.0, DefaultLength: 40, DefaultWidth: 30, DefaultHeight: 10},
			{Name: "Smart Home & IoT", CategoryId: electronics.ID, Status: "active", DefaultWeight: 0.8, DefaultLength: 25, DefaultWidth: 20, DefaultHeight: 5},
			{Name: "Cameras & Photography", CategoryId: electronics.ID, Status: "active", DefaultWeight: 1.2, DefaultLength: 25, DefaultWidth: 15, DefaultHeight: 12},
			{Name: "Wearable Technology", CategoryId: electronics.ID, Status: "active", DefaultWeight: 0.2, DefaultLength: 10, DefaultWidth: 5, DefaultHeight: 2},
		}
		subcategories = append(subcategories, electronicsSubcats...)
	}

	// Fashion subcategories
	if fashion.ID != "" {
		fashionSubcats := []domain.SubCategory{
			{Name: "Men's Clothing", CategoryId: fashion.ID, Status: "active", DefaultWeight: 0.5, DefaultLength: 30, DefaultWidth: 25, DefaultHeight: 3},
			{Name: "Women's Clothing", CategoryId: fashion.ID, Status: "active", DefaultWeight: 0.4, DefaultLength: 30, DefaultWidth: 25, DefaultHeight: 3},
			{Name: "Shoes & Footwear", CategoryId: fashion.ID, Status: "active", DefaultWeight: 1.0, DefaultLength: 33, DefaultWidth: 22, DefaultHeight: 12},
			{Name: "Bags & Accessories", CategoryId: fashion.ID, Status: "active", DefaultWeight: 0.6, DefaultLength: 35, DefaultWidth: 30, DefaultHeight: 5},
			{Name: "Jewelry & Watches", CategoryId: fashion.ID, Status: "active", DefaultWeight: 0.2, DefaultLength: 18, DefaultWidth: 13, DefaultHeight: 8},
			{Name: "Children's Clothing", CategoryId: fashion.ID, Status: "active", DefaultWeight: 0.3, DefaultLength: 25, DefaultWidth: 20, DefaultHeight: 3},
			{Name: "Sportswear & Activewear", CategoryId: fashion.ID, Status: "active", DefaultWeight: 0.4, DefaultLength: 30, DefaultWidth: 25, DefaultHeight: 3},
		}
		subcategories = append(subcategories, fashionSubcats...)
	}

	// Home & Garden subcategories
	if homeGarden.ID != "" {
		homeGardenSubcats := []domain.SubCategory{
			{Name: "Furniture", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 12.0, DefaultLength: 80, DefaultWidth: 60, DefaultHeight: 20},
			{Name: "Kitchen & Dining", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 1.5, DefaultLength: 25, DefaultWidth: 20, DefaultHeight: 12},
			{Name: "Home Decor", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 0.8, DefaultLength: 30, DefaultWidth: 25, DefaultHeight: 15},
			{Name: "Garden & Outdoor", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 2.0, DefaultLength: 40, DefaultWidth: 30, DefaultHeight: 15},
			{Name: "Storage & Organization", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 1.2, DefaultLength: 35, DefaultWidth: 25, DefaultHeight: 20},
			{Name: "Bedding & Linens", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 1.0, DefaultLength: 30, DefaultWidth: 25, DefaultHeight: 10},
			{Name: "Lighting", CategoryId: homeGarden.ID, Status: "active", DefaultWeight: 0.6, DefaultLength: 25, DefaultWidth: 15, DefaultHeight: 15},
		}
		subcategories = append(subcategories, homeGardenSubcats...)
	}

	// Books subcategories
	if books.ID != "" {
		booksSubcats := []domain.SubCategory{
			{Name: "Fiction & Literature", CategoryId: books.ID, Status: "active", DefaultWeight: 0.4, DefaultLength: 20, DefaultWidth: 13, DefaultHeight: 2},
			{Name: "Educational & Textbooks", CategoryId: books.ID, Status: "active", DefaultWeight: 0.8, DefaultLength: 25, DefaultWidth: 18, DefaultHeight: 3},
			{Name: "Children's Books", CategoryId: books.ID, Status: "active", DefaultWeight: 0.3, DefaultLength: 22, DefaultWidth: 16, DefaultHeight: 1},
			{Name: "Business & Self-Help", CategoryId: books.ID, Status: "active", DefaultWeight: 0.5, DefaultLength: 23, DefaultWidth: 15, DefaultHeight: 2},
			{Name: "Art & Design", CategoryId: books.ID, Status: "active", DefaultWeight: 1.0, DefaultLength: 28, DefaultWidth: 22, DefaultHeight: 2},
			{Name: "Stationery & Office", CategoryId: books.ID, Status: "active", DefaultWeight: 0.2, DefaultLength: 20, DefaultWidth: 15, DefaultHeight: 5},
		}
		subcategories = append(subcategories, booksSubcats...)
	}

	// Food & Beverages subcategories
	if foodBeverages.ID != "" {
		foodBeveragesSubcats := []domain.SubCategory{
			{Name: "Snacks & Confectioneries", CategoryId: foodBeverages.ID, Status: "active", DefaultWeight: 1.2, DefaultLength: 25, DefaultWidth: 20, DefaultHeight: 12},
			{Name: "Beverages & Drinks", CategoryId: foodBeverages.ID, Status: "active", DefaultWeight: 1.5, DefaultLength: 30, DefaultWidth: 20, DefaultHeight: 25},
			{Name: "Packaged Foods", CategoryId: foodBeverages.ID, Status: "active", DefaultWeight: 2.0, DefaultLength: 30, DefaultWidth: 25, DefaultHeight: 15},
			{Name: "Health & Wellness", CategoryId: foodBeverages.ID, Status: "active", DefaultWeight: 0.5, DefaultLength: 15, DefaultWidth: 10, DefaultHeight: 8},
			{Name: "Organic & Natural", CategoryId: foodBeverages.ID, Status: "active", DefaultWeight: 1.0, DefaultLength: 25, DefaultWidth: 18, DefaultHeight: 10},
			{Name: "International Cuisine", CategoryId: foodBeverages.ID, Status: "active", DefaultWeight: 1.8, DefaultLength: 28, DefaultWidth: 22, DefaultHeight: 12},
		}
		subcategories = append(subcategories, foodBeveragesSubcats...)
	}

	// Create subcategories
	for _, subcat := range subcategories {
		var existingSubcat domain.SubCategory
		if err := db.Where("name = ? AND category_id = ?", subcat.Name, subcat.CategoryId).First(&existingSubcat).Error; err != nil {
			// Subcategory doesn't exist, create it
			if err := db.Create(&subcat).Error; err != nil {
				log.Printf("Failed to create subcategory %s: %v", subcat.Name, err)
			} else {
				log.Printf("✅ Created subcategory: %s", subcat.Name)
			}
		} else {
			log.Printf("Subcategory %s already exists", subcat.Name)
		}
	}
	
	// Create a single admin user for testing
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	adminUser := domain.User{
		Firstname:    "Admin",
		Lastname:     "User", 
		Email:        "admin@instashop.local",
		UserName:     "admin",
		Phone:        "+1234567890",
		Password:     string(hashedPassword),
	}
	
	if err := db.Create(&adminUser).Error; err != nil {
		log.Printf("Admin user already exists: %v", err)
	} else {
		log.Printf("✅ Created admin user: %s", adminUser.Email)
	}
	
	log.Println("✅ Realistic data seeding completed!")
	log.Println("")
	log.Println("📝 Admin Credentials:")
	log.Println("  Email: admin@instashop.local")
	log.Println("  Password: admin123")
	log.Println("")
	log.Println("🎯 Ready for realistic testing!")
	log.Println("   - No hardcoded vendors or products")
	log.Println("   - Users must register/create businesses")
	log.Println("   - Products must be created through the app")
	log.Println("   - Real data flow and validation")
	
	return nil
}