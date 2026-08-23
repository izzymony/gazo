#!/bin/bash

# Staging Database Migration Script
# Created: August 27, 2025
# Purpose: Apply schema and data updates to staging database

set -e

echo "🚀 Starting staging database migration..."

# Database connection details (will be set by CI/CD environment)
DB_HOST=${DB_HOST:-"staging-db-host"}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-"staging-user"}
DB_NAME=${DB_NAME:-"instashop_staging"}

echo "📋 Migration plan:"
echo "  1. Category data (002_categories_data.sql)"
echo "  2. Emergency category fix (003_emergency_category_fix.sql)"  
echo "  3. External mappings fix (004_fix_external_mappings.sql)"
echo "  Note: Schema updates handled by GORM AutoMigrate"

# Function to run SQL file
run_sql() {
    local file=$1
    echo "  ⏳ Running: $file"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $file
    echo "  ✅ Completed: $file"
}

# Backup existing data first (optional - uncomment if needed)
# echo "📦 Creating backup..."
# pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Run migrations in sequence
echo "🔧 Applying migrations..."

# Schema is handled by GORM AutoMigrate on app startup
echo "  ℹ️ Schema updates handled by GORM AutoMigrate"
run_sql "002_categories_data.sql"
run_sql "003_emergency_category_fix.sql"
run_sql "004_fix_external_mappings.sql"

echo "✨ Migration completed successfully!"
echo "📊 Please verify the staging database and test the application."