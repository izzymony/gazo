//go:build ignore

package main

import (
	"log"
	"os"
	"github.com/Tinovalabs/vibaar/services/backend/internal/seeder"
	"github.com/joho/godotenv"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/migration"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env.local"); err != nil {
		log.Println("No .env.local file found, trying .env")
		if err := godotenv.Load(); err != nil {
			log.Println("No .env file found, using system environment variables")
		}
	}
	
	// Set realistic testing environment
	os.Setenv("ENV", "local")
	os.Setenv("ENABLE_MOCK_SERVICES", "false")
	
	// Connect to database
	db := database.ConnectDB()
	if db == nil {
		log.Fatal("Failed to connect to database")
	}
	
	// Run migrations first
	migration.Migrate()
	
	// Seed with realistic data only
	if err := seeder.SeedRealisticData(); err != nil {
		log.Fatal("Failed to seed realistic data:", err)
	}
	
	log.Println("🎯 Realistic data seeding completed successfully!")
}