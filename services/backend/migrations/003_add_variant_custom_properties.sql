-- Migration: Add custom properties support to variants table
-- This migration adds fields to store custom property ownership and values for variants

-- Add custom properties columns to variants table
ALTER TABLE variants ADD COLUMN IF NOT EXISTS owned_properties JSONB DEFAULT '[]'::jsonb;
ALTER TABLE variants ADD COLUMN IF NOT EXISTS price_values JSONB DEFAULT '{}'::jsonb;
ALTER TABLE variants ADD COLUMN IF NOT EXISTS stock_values JSONB DEFAULT '{}'::jsonb;
ALTER TABLE variants ADD COLUMN IF NOT EXISTS image_values JSONB DEFAULT '{}'::jsonb;

-- Create indexes for better performance on JSONB queries
CREATE INDEX IF NOT EXISTS idx_variants_owned_properties ON variants USING GIN (owned_properties);
CREATE INDEX IF NOT EXISTS idx_variants_price_values ON variants USING GIN (price_values);

-- Comments for documentation
COMMENT ON COLUMN variants.owned_properties IS 'Array of properties this variant owns (e.g., ["price", "stock", "image"])';
COMMENT ON COLUMN variants.price_values IS 'JSON object mapping variant values to price adjustments (e.g., {"Red": 100, "Blue": 200})';
COMMENT ON COLUMN variants.stock_values IS 'JSON object mapping variant values to stock amounts (e.g., {"Small": 50, "Large": 75})';
COMMENT ON COLUMN variants.image_values IS 'JSON object mapping variant values to image URLs (e.g., {"Red": "url1", "Blue": "url2"})';