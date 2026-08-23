-- Migration: Drop legacy variant_combinations table
-- This table is no longer needed as combinations are calculated on-demand
-- Part of the simplified variant system architecture

-- Drop the variant_combinations table completely
DROP TABLE IF EXISTS variant_combinations CASCADE;

-- Note: This migration is safe to run as:
-- 1. The application no longer depends on this table
-- 2. All combination logic now uses on-demand calculation
-- 3. Order fulfillment is handled via new variant_selection fields in order_items