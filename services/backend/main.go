package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/routes"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/crons"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/migration"
	"github.com/Tinovalabs/vibaar/services/backend/internal/seeder"

	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		logger.Error("Error loading .env file")
	}

	// B6: refuse to start without a JWT signing secret — an empty JWT_SECRET
	// would let anyone forge valid tokens.
	if os.Getenv("JWT_SECRET") == "" {
		logger.Error("JWT_SECRET is not set — refusing to start (authentication would be forgeable)")
		os.Exit(1)
	}

	// Initialize Sentry for error tracking
	sentryDSN := os.Getenv("SENTRY_DSN")
	if sentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDSN,
			Environment:      os.Getenv("APP_ENV"),
			Release:          os.Getenv("APP_NAME") + "@1.0.0",
			TracesSampleRate: 0.2,
		}); err != nil {
			logger.Error(fmt.Sprintf("Sentry initialization failed: %v", err))
		} else {
			logger.Info("Sentry error tracking initialized")
			defer sentry.Flush(2 * time.Second)
		}
	}

	// Handle command line arguments
	if len(os.Args) > 1 && os.Args[1] == "seed" {
		// Run seeding only
		fmt.Println("🌱 Running database seeding...")
		seeder.SeedData()
		fmt.Println("✅ Seeding completed, exiting...")
		return
	}

	migration.Migrate()

	log.SetOutput(&lumberjack.Logger{
		Filename:   "./logs/insta.log",
		MaxSize:    300, // megabytes
		MaxBackups: 300,
		MaxAge:     360,  // days
		Compress:   true, // disabled by default
	})

	router := gin.Default()

	// Add Sentry middleware for panic recovery and error reporting
	if sentryDSN != "" {
		router.Use(sentrygin.New(sentrygin.Options{
			Repanic: true,
		}))
	}

	// Serve static files from uploads directory for local development
	router.Static("/uploads", "./uploads")

	db := database.ConnectDB()
	handler := controller.NewHTTPHandler(db)
	routes.RegisterRoutes(router, handler)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}
	crons.StartCron(db, mysql_repo.NewWalletRepository(db), mysql_repo.NewProductRepository(db), mysql_repo.NewOrderRepository(db))
	logger.Info(fmt.Sprintf("Starting server on port %v", port))
	fmt.Printf("Starting server on port %v", port)
	router.Run(":" + port)
}
