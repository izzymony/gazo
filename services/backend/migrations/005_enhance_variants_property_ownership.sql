-- Migration: Enhanced variant property ownership system
-- Adds property ownership and value storage capabilities to variants table

-- Add property ownership and value columns to variants table
ALTER TABLE variants
ADD COLUMN IF NOT EXISTS owned_properties JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS price_values JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS stock_values JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS image_values JSONB DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_variants_owned_properties
ON variants USING GIN (owned_properties);

CREATE INDEX IF NOT EXISTS idx_variants_price_values
ON variants USING GIN (price_values);

CREATE INDEX IF NOT EXISTS idx_variants_stock_values
ON variants USING GIN (stock_values);

-- Add comments for documentation
COMMENT ON COLUMN variants.owned_properties IS 'Array of property types this variant owns: ["price", "stock", "image"]';
COMMENT ON COLUMN variants.price_values IS 'Price adjustments per variant value: {"Red": 100, "Blue": 200}';
COMMENT ON COLUMN variants.stock_values IS 'Stock amounts per variant value: {"Small": 50, "Large": 20}';
COMMENT ON COLUMN variants.image_values IS 'Image URLs per variant value: {"Red": "red.jpg", "Blue": "blue.jpg"}';