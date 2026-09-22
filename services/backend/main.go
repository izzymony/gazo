package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/controller"
	"github.com/Tinovalabs/vibaar/services/backend/internal/adapter/api/routes"
	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/external_service/shipping"
	"github.com/Tinovalabs/vibaar/services/backend/internal/crons"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
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
	// would let anyone forge valid tokens. (Enforced in every environment.)
	if os.Getenv("JWT_SECRET") == "" {
		logger.Error("JWT_SECRET is not set — refusing to start (authentication would be forgeable)")
		os.Exit(1)
	}

	// Production environment guard: fail-fast rather than boot a misconfigured
	// production deploy (test payment keys, public KYC storage, OTP bypasses,
	// localhost URLs, inconsistent APP_ENV/ENV). Reports every problem at once.
	if errs := helper.ValidateEnv(os.Getenv); len(errs) > 0 {
		for _, e := range errs {
			logger.Error("invalid environment configuration: " + e.Error())
		}
		logger.Error("refusing to start — fix the environment configuration above")
		os.Exit(1)
	}

	// Shipping provider guard. Separate from ValidateEnv because it applies in
	// EVERY environment, not just production: the defect it exists to prevent
	// was a staging misconfiguration (SHIPBUBBLE_API_URL pointing at the
	// dashboard host), and it presented as "this seller has no delivery option
	// for your address" — a plausible product message — for as long as it was
	// set. Checkout cannot work without a correct base URL and the right key,
	// so refusing to boot is strictly better than discovering it per-request.
	shippingErrs, shippingWarnings := shipping.ValidateConfig(os.Getenv)
	for _, w := range shippingWarnings {
		logger.Info("shipping configuration warning: " + w)
	}
	if len(shippingErrs) > 0 {
		for _, e := range shippingErrs {
			logger.Error("invalid shipping configuration: " + e.Error())
		}
		logger.Error("refusing to start — fix the shipping configuration above")
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
