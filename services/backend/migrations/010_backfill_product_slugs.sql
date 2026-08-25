-- Migration: 010_backfill_product_slugs.sql
-- Purpose: STOREFRONT-URL-REWORK — ensure every product has a slug so the product
--   URL /store/{tag}/products/{slug}--{id} has a cosmetic slug for all rows.
--   The product URL resolves by the trailing UUID, so the slug is display/SEO only
--   and is NOT unique — no unique constraint here.
--
-- ⚠️  DELIBERATE, OWNER-RUN migration (not AutoMigrate). Idempotent — only touches
--     rows whose slug is NULL/empty. New products already get a slug on create,
--     and updates regenerate it from the title (productService).
--
-- Mirrors the app's GenerateSlug: lowercase → non-[a-z0-9_] runs to '-' → collapse
-- → trim hyphens. Empty result (e.g. emoji-only titles) falls back to 'product'.
UPDATE products
SET slug = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower(trim(title)), '[^a-z0-9_]+', '-', 'g')), ''),
  'product'
)
WHERE slug IS NULL OR trim(slug) = '';
