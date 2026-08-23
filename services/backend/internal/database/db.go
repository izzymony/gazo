package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DBInstance *gorm.DB

func ConnectDB() *gorm.DB {
	var db *gorm.DB
	var err error
	dsn := os.Getenv("DB_DSN")

	var logOutput *log.Logger
	// if os.Getenv("ENV") != "local" {
	// 	logOutput = log.New(&lumberjack.Logger{
	// 		Filename:   helper.LogFile,
	// 		MaxSize:    300,
	// 		MaxBackups: 300,
	// 		MaxAge:     360,
	// 		Compress:   true,
	// 	}, "\r\n", log.LstdFlags)
	// } else {
	logOutput = log.New(os.Stdout, "\r\n", log.LstdFlags)
	// }

	newLogger := logger.New(
		logOutput,
		logger.Config{
			SlowThreshold: time.Second,
			LogLevel:      logger.Info,
			Colorful:      os.Getenv("ENV") == "local",
		},
	)

	if os.Getenv("DB_DRIVER") == "mysql" {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true,
			Logger:                                   newLogger,
		})
	} else {
		if dsn == "" {
			dsn = fmt.Sprintf("host=%v user=%v password=%v dbname=%v port=%v sslmode=disable TimeZone=Africa/Lagos",
				os.Getenv("DB_HOST"),
				os.Getenv("DB_USER"),
				os.Getenv("DB_PASSWORD"),
				os.Getenv("DB_DATABASE"),
				os.Getenv("DB_PORT"),
			)
		}
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			DisableForeignKeyConstraintWhenMigrating: true,
			Logger:                                   newLogger,
		})
	}

	if err != nil {
		panic(err)
	}

	// Configure connection pool for production stability
	sqlDB, err := db.DB()
	if err != nil {
		panic(err)
	}

	// Production-optimized connection pool settings
	sqlDB.SetMaxIdleConns(10)                  // Keep 10 idle connections ready
	sqlDB.SetMaxOpenConns(100)                 // Allow up to 100 concurrent connections
	sqlDB.SetConnMaxLifetime(time.Hour)        // Recycle connections every hour

	DBInstance = db
	return db
}
