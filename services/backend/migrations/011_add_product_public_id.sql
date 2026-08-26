-- Migration: 011_add_product_public_id.sql
-- Purpose: STOREFRONT-URL-REWORK Rev 2 — add products.public_id, the short, immutable,
--   non-sequential public identifier used in buyer product URLs
--   (/@{handle}/p/{slug}-{publicId}). The internal UUID (products.id) stays internal
--   and never appears in a public URL.
--
-- ⚠️  DELIBERATE, OWNER-RUN migration (not GORM AutoMigrate). Run against STAGING first.

-- Step 1: column
ALTER TABLE products ADD COLUMN IF NOT EXISTS public_id varchar(12);

-- Step 2: backfill each product lacking one with a 10-char lowercase-hex id.
-- The product's unique id is folded into the hash input so distinct products get
-- distinct ids; collision on the 10-char truncation is negligible for the catalog
-- size and the unique index (Step 3) is the backstop — if Step 3 ever errors, re-run
-- this UPDATE for the remaining NULLs, then re-run Step 3.
UPDATE products
SET public_id = substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 10)
WHERE public_id IS NULL OR public_id = '';

-- Step 3: uniqueness + lookup index (the by-public-id resolver reads this).
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_public_id ON products (public_id);

-- Note: new products get a base36 public_id from the app (helper.GeneratePublicID) on
-- create; both forms are hyphen-free lowercase-alphanumeric and match ^[a-z0-9]{8,10}$.
