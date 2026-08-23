package seeder

import (
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"insta-api/internal/core/domain"
	"insta-api/internal/database"
	"insta-api/internal/helper"
	"insta-api/internal/logger"
)

func SeedData() {
	db := database.ConnectDB()
	var user domain.User
	p, _ := bcrypt.GenerateFromPassword([]byte("password123"), 14)
	userData := domain.User{
		Firstname:         "Sam",
		Lastname:          "Show",
		Email:             "sam.show@example.com",
		UserName:          "samshow",
		Phone:             "2347039628093",
		Password:          string(p),
		Recommendations:   "None",
		InstagramID:       "",
		AuthType:          "email",
		InstagramUsername: "",
	}

	result := db.Where("email = ?", userData.Email).First(&user)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			if err := db.Create(&userData).Error; err != nil {
				logger.Info(fmt.Sprintf("Failed to create user: %v", err))
				return
			}
			logger.Info("New user created successfully")
		} else {
			logger.Info(fmt.Sprintf("Error finding user: %v", result.Error))
			return
		}
	} else {
		if err := db.Model(&user).Updates(userData).Error; err != nil {
			logger.Info(fmt.Sprintf("Failed to update user: %v", err))
			return
		}
		logger.Info("User updated successfully")
	}

	businessNames := []string{"Show's Fashion Store"}
	for _, businessName := range businessNames {
		var business domain.Business
		db.Where("name = ?", businessName).FirstOrCreate(&business, domain.Business{Name: businessName})
		imageUrl := "https://fastly.picsum.photos/id/520/400/500.jpg?grayscale&hmac=uxxsBIay89E6CuBBexTBWggKWm848DCkLKFYfwUK1ao"
		businessData := domain.Business{
			UserID:   user.ID,
			Name:     businessName,
			Tag:      "Fashion",
			Phone:    "2347039628093",
			Email:    fmt.Sprintf("%s@example.com", businessName),
			Category: "Retail",
			Address: &domain.BusinessAddress{
				Area:                  helper.ToStringPtr("Lagos"),
				Country:               "Nigeria",
				AddressLine:           "6 Bode Thomas Street, Surulere, Lagos, Nigeria",
				ShipbubbleAddressCode: 63312299,
			},
			BusinessSetting: &domain.BusinessSetting{
				ShippingAmount: 10.00,
				ShippingType:   "Standard",
				PersonalisedSettings: domain.PersonalisedSettings{
					BackgroundColor: "#FFFFFF",
					BackgroundState: "color",
					BackgroundImage: imageUrl,
				},
			},
			BankAccountDetails: []domain.BusinessBankAccountDetail{{
				Bank:          "Bank of America",
				AccountNumber: "123456789",
			}},
		}

		if err := db.Model(&business).Where("id = ?", business.ID).Updates(businessData).Error; err != nil {
			logger.Error(fmt.Sprintf("error updating business: %v", err))
		}

		if businessData.Address != nil {
			db.Model(&domain.BusinessAddress{}).
				Where("business_id = ?", business.ID).
				Updates(*businessData.Address)
		}

		if businessData.BusinessSetting != nil {
			db.Model(&domain.BusinessSetting{}).
				Where("business_id = ?", business.ID).
				Updates(*businessData.BusinessSetting)

			db.Model(&domain.BusinessSetting{}).
				Where("business_id = ?", business.ID).
				Updates(map[string]interface{}{
					"background_color": businessData.BusinessSetting.PersonalisedSettings.BackgroundColor,
					"background_state": businessData.BusinessSetting.PersonalisedSettings.BackgroundState,
					"background_image": businessData.BusinessSetting.PersonalisedSettings.BackgroundImage,
				})
		}

		if businessData.BankAccountDetails != nil {
			db.Model(&domain.BusinessBankAccountDetail{}).
				Where("business_id = ?", business.ID).
				Updates(businessData.BankAccountDetails)
		}

		// var externalCategory domain.ExternalCategory
		// db.Where("provider_id = ?", "2178251").FirstOrCreate(&externalCategory, domain.ExternalCategory{
		// 	ProviderId: "2178251",
		// 	Name:       "Accessory",
		// 	Provider:   "shipbubble",
		// })

		for i := 1; i <= 3; i++ {
			productSlug := fmt.Sprintf("Nike Shoe %v", i)
			var product domain.Product
			db.Where("slug = ?", productSlug).FirstOrCreate(&product, domain.Product{Slug: productSlug})

			// Get Men's Fashion category from new comprehensive seeding
			var mensFashionCategory domain.Category
			db.Where("slug = ?", "mens-fashion").First(&mensFashionCategory)
			
			// Get a subcategory for Men's Fashion (shoes)
			var shoesSubcategory domain.SubCategory
			db.Where("category_id = ? AND name ILIKE ?", mensFashionCategory.ID, "%shoes%").First(&shoesSubcategory)
			
			productData := domain.Product{
				Title:         fmt.Sprintf("Nike Shoe %v", i),
				Description:   "Cool Nike Shoe",
				Image:         domain.StrArray{"https://images.unsplash.com/photo-1542291026-7eec264c27ff?fm=jpg&amp;q=60&amp;w=3000&amp;ixlib=rb-4.1.0&amp;ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"},
				Stock:         helper.ToPtr(100),
				Sales:         helper.ToPtr(10),
				Tag:           domain.StrArray{"nike shoe", "nike"},
				IsCombination: false,
				Status:        "active",
				CategoryID:    mensFashionCategory.ID, // Use dynamic category ID from new system
				SubCategoryID: shoesSubcategory.ID,    // Add proper subcategory
				UserID:        user.ID,
				BusinessID:    business.ID,
				Length:        10.0,
				Width:         5.0,
				Height:        2.0,
				Weight:        10.0,
				OldPrice:      100.00,
				Price:         90.00,
			}
			db.Model(&product).Updates(productData)
		}
	}
	// Use comprehensive category seeding instead of the old method
	err := SeedComprehensiveCategories(db)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to seed comprehensive categories: %v", err))
	} else {
		logger.Info("Comprehensive category seeding completed successfully")
	}
	
	// Keep the old seeding for external categories
	seedCategories(db)
	
	// Seed admin users
	seedAdminUsers(db)

	// Seed notification templates
	err = SeedNotificationTemplates(db)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to seed notification templates: %v", err))
	} else {
		logger.Info("Notification template seeding completed successfully")
	}

	logger.Info("Data seeding completed")
}

func seedCategories(db *gorm.DB) {
	categories := []domain.ExternalCategory{
		{Name: "Hot food", Provider: "external", ProviderId: "98190590"},
		{Name: "Dry food and supplements", Provider: "external", ProviderId: "24032950"},
		{Name: "Electronics and gadgets", Provider: "external", ProviderId: "77179563"},
		{Name: "Groceries", Provider: "external", ProviderId: "2178251"},
		{Name: "Sensitive items (ATM cards, documents)", Provider: "external", ProviderId: "67658572"},
		{Name: "Light weight items", Provider: "external", ProviderId: "20754594"},
		{Name: "Machinery", Provider: "external", ProviderId: "67008831"},
		{Name: "Medical supplies", Provider: "external", ProviderId: "57487393"},
		{Name: "Health and beauty", Provider: "external", ProviderId: "99652979"},
		{Name: "Furniture and fittings", Provider: "external", ProviderId: "25590994"},
		{Name: "Fashion wears", Provider: "external", ProviderId: "74794423"},
	}

	for _, category := range categories {
		err := db.
			Where("name = ?", category.Name).
			Assign(domain.ExternalCategory{
				ProviderId: category.ProviderId,
				Provider:   "shipbubble",
			}).
			FirstOrCreate(&category).Error

		if err != nil {
			fmt.Printf("Error upserting category '%s': %v\n", category.Name, err)
		} else {
			fmt.Printf("Category '%s' upserted successfully\n", category.Name)
		}
	}
}

func SeedSubCategoryDefaults(db *gorm.DB) {
	type DefaultSpec struct {
		Slug   string
		Length float64
		Width  float64
		Height float64
		Weight float64
	}

	defaults := []DefaultSpec{
		{"clothing", 30, 25, 3, 0.35},
		{"shoes-and-footwares", 33, 22, 12, 1.00},
		{"bags-and-accesssories", 35, 28, 10, 0.80},
		{"trads", 35, 30, 5, 0.60},
		{"shoes-and-bags", 33, 22, 12, 1.00},
		{"baby-clothings", 30, 25, 3, 0.35},
		{"baby-party-wears", 30, 25, 3, 0.35},
		{"skincare", 18, 13, 8, 0.25},
		{"makeup", 18, 13, 8, 0.25},
		{"mens-grooming", 18, 13, 8, 0.25},
		{"fragrances", 18, 13, 8, 0.25},
		{"furniture", 80, 60, 20, 12.00},
		{"snacks-and-confectioneries", 25, 20, 12, 1.20},
	}

	for _, d := range defaults {
		var subcats []domain.SubCategory
		err := db.
			Where("slug = ?", d.Slug).
			Find(&subcats).Error

		if err != nil {
			fmt.Printf("Error finding subcategories for slug '%s': %v\n", d.Slug, err)
			continue
		}

		if len(subcats) == 0 {
			fmt.Printf("No subcategories found for slug '%s'\n", d.Slug)
			continue
		}

		for _, subcat := range subcats {
			subcat.DefaultLength = d.Length
			subcat.DefaultWidth = d.Width
			subcat.DefaultHeight = d.Height
			subcat.DefaultWeight = d.Weight

			err = db.Save(&subcat).Error
			if err != nil {
				fmt.Printf("Failed to update subcategory '%s': %v\n", *subcat.Slug, err)
			} else {
				fmt.Printf("Updated subcategory '%s' with default dimensions.\n", *subcat.Slug)
			}
		}
	}
}

func seedAdminUsers(db *gorm.DB) {
	// Check if admin user already exists
	var existingAdmin domain.AdminUser
	result := db.Where("email = ?", "admin@instashop.com").First(&existingAdmin)
	
	if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
		logger.Error(fmt.Sprintf("Error checking for existing admin: %v", result.Error))
		return
	}
	
	// Generate password hash
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123456"), bcrypt.DefaultCost)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to hash admin password: %v", err))
		return
	}
	
	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// Create new admin user
		adminUser := domain.AdminUser{
			Email:        "admin@instashop.com",
			PasswordHash: string(hashedPassword),
			Name:         "System Administrator",
			Role:         "super_admin",
			Permissions:  domain.JSON{"all": true},
			IsActive:     true,
		}
		
		if err := db.Create(&adminUser).Error; err != nil {
			logger.Error(fmt.Sprintf("Failed to create admin user: %v", err))
			return
		}
		
		logger.Info("✅ Created admin user: admin@instashop.com with password: admin123456")
	} else {
		// Update existing admin user with known password
		existingAdmin.PasswordHash = string(hashedPassword)
		existingAdmin.Name = "System Administrator"
		existingAdmin.Role = "super_admin"
		existingAdmin.Permissions = domain.JSON{"all": true}
		existingAdmin.IsActive = true
		
		if err := db.Save(&existingAdmin).Error; err != nil {
			logger.Error(fmt.Sprintf("Failed to update admin user: %v", err))
			return
		}
		
		logger.Info("✅ Updated admin user: admin@instashop.com with password: admin123456")
	}
}
