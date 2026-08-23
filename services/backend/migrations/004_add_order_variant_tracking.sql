-- Migration: Add variant tracking to order_items table
-- Purpose: Fix critical fulfillment gap - orders must track which variant was selected
-- Date: 2025-01-25

-- Add variant tracking columns to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant_selection TEXT,  -- e.g., "Red-Large"
ADD COLUMN IF NOT EXISTS variant_data JSONB;      -- Full variant details for fulfillment

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_variant_selection
ON order_items(variant_selection)
WHERE variant_selection IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN order_items.variant_selection IS 'Human-readable variant selection (e.g., Red-Large)';
COMMENT ON COLUMN order_items.variant_data IS 'Complete variant details: selected values, prices, stock at time of order';