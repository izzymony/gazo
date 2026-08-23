# Staging Database Migrations

## Overview
These migration scripts update the staging database with improved schema and data from local development.

## Migration Files

1. **001_schema.sql** - Database schema structure (tables, indexes, constraints)
2. **002_categories_data.sql** - Updated category and subcategory data
3. **003_emergency_category_fix.sql** - Fixes products with broken category references
4. **004_fix_external_mappings.sql** - Maps external category systems

## How to Apply

### Automatic (via CI/CD)
Migrations will run automatically when deploying to staging if `RUN_MIGRATIONS=true` is set.

### Manual Application
```bash
# Set environment variables
export DB_HOST=your-staging-host
export DB_PORT=5432
export DB_USER=your-staging-user
export DB_NAME=instashop_staging
export DB_PASSWORD=your-password

# Run migrations
./run_migrations.sh
```

## Safety Notes
- Always backup staging database before running migrations
- Test on a copy of staging data first if possible
- Schema updates may fail if objects exist - this is okay
- Data updates are idempotent (safe to run multiple times)

## Rollback
If issues occur, restore from backup:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_before_migration_*.sql
```

## Created
- Date: August 27, 2025
- Purpose: Sync staging with local improvements
- Safe for: Staging environment only