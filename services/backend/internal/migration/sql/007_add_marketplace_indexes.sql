-- Migration: 007_add_marketplace_indexes.sql
-- Purpose: Add missing indexes on order_items table to improve marketplace/vendor queries
-- These indexes fix full table scans in vendor ranking and product popularity queries

-- Index for product-based aggregations (e.g., counting orders per product)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Index for business-based aggregations (e.g., counting orders per vendor)
CREATE INDEX IF NOT EXISTS idx_order_items_business_id ON order_items(business_id);

-- Index for time-based filtering (e.g., recent orders)
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at);

-- Composite index for time-filtered vendor queries (get-top-vendors uses 7-day window)
CREATE INDEX IF NOT EXISTS idx_order_items_created_business ON order_items(created_at, business_id);

-- Composite index for active products by business (used in business listing with products)
CREATE INDEX IF NOT EXISTS idx_products_business_status ON products(business_id, status);
