-- =====================================================
-- myInstaShop Product Variant System - Database Extensions
-- Migration: 002_create_variant_combinations_table.sql
-- Purpose: Add variant combinations support for enhanced product variations
-- =====================================================

-- Variant Combinations Table
-- Stores individual variant combinations with specific pricing and inventory
CREATE TABLE IF NOT EXISTS variant_combinations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Relationships
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    -- Combination Identity
    combination_key TEXT NOT NULL,  -- "Red / Large" - human readable combination
    sku TEXT,                      -- Optional unique SKU for this specific combination

    -- Pricing & Inventory
    price NUMERIC,                 -- Specific price for this combination (NULL = use base product price)
    stock INTEGER NOT NULL DEFAULT 0, -- Individual stock count for this combination

    -- Media & Content
    images JSONB,                  -- Array of image URLs specific to this combination ["img1.jpg", "img2.jpg"]

    -- Status & Metadata
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
    sort_order INTEGER DEFAULT 0,  -- For admin interface ordering/display

    -- Data Integrity Constraints
    CONSTRAINT unique_product_combination UNIQUE(product_id, combination_key),
    CONSTRAINT valid_stock CHECK (stock >= 0),
    CONSTRAINT valid_price CHECK (price IS NULL OR price >= 0),
    CONSTRAINT valid_sort_order CHECK (sort_order >= 0)
);

-- Performance Indexes
-- Fast product combination lookups for inventory management
CREATE INDEX IF NOT EXISTS idx_variant_combinations_product_id ON variant_combinations(product_id);

-- Fast status filtering for admin interface and inventory queries
CREATE INDEX IF NOT EXISTS idx_variant_combinations_status ON variant_combinations(status);

-- Fast stock level queries for low inventory alerts
CREATE INDEX IF NOT EXISTS idx_variant_combinations_stock ON variant_combinations(stock);

-- Fast combination key searches for order processing
CREATE INDEX IF NOT EXISTS idx_variant_combinations_combination_key ON variant_combinations(combination_key);

-- Composite index for common queries (product + status)
CREATE INDEX IF NOT EXISTS idx_variant_combinations_product_status ON variant_combinations(product_id, status);

-- =====================================================
-- Migration Notes:
-- =====================================================
-- This migration adds support for enhanced product variants with:
--
-- 1. Individual Combination Management:
--    - Each variant combination (e.g., "Red / Large") gets its own record
--    - Supports custom pricing per combination
--    - Individual stock tracking per combination
--    - Combination-specific images
--
-- 2. Data Integrity:
--    - Foreign key constraint ensures combinations belong to valid products
--    - Unique constraint prevents duplicate combinations per product
--    - Check constraints ensure valid data (non-negative stock/price)
--    - Cascade delete removes combinations when product is deleted
--
-- 3. Performance Optimization:
--    - Indexes for fast product, status, stock, and combination queries
--    - Composite index for common admin interface filtering
--
-- 4. Admin Interface Support:
--    - Status field for combination management
--    - Sort order for custom admin display ordering
--    - Flexible JSONB images field for multiple combination images
--
-- 5. Backwards Compatibility:
--    - Existing products without variants are unaffected
--    - Products table remains unchanged
--    - Existing variant structure in 'variants' table preserved
--
-- =====================================================
-- Example Usage After Migration:
-- =====================================================
--
-- Insert a variant combination:
-- INSERT INTO variant_combinations (product_id, combination_key, price, stock, images, status)
-- VALUES ('product-uuid', 'Red / Large', 5000.00, 25, '["red-large-1.jpg", "red-large-2.jpg"]', 'active');
--
-- Query combinations for a product:
-- SELECT * FROM variant_combinations WHERE product_id = 'product-uuid' AND status = 'active';
--
-- Check stock for specific combination:
-- SELECT stock FROM variant_combinations WHERE product_id = 'product-uuid' AND combination_key = 'Red / Large';
--
-- =====================================================