-- Migration: 010_backfill_product_slugs.sql
-- Purpose: STOREFRONT-URL-REWORK — ensure every product has a slug so the product
--   URL /store/{tag}/products/{slug}--{id} has a cosmetic slug for all rows.
--   The product URL resolves by the trailing UUID, so the slug is display/SEO only
--   and is NOT unique — no unique constraint here.
--
-- ⚠️  DELIBERATE, OWNER-RUN migration (not AutoMigrate). Idempotent.
--
-- Regenerates EVERY product's slug from its title (canonical) — not just the
-- empty ones. Legacy rows carry dirty slugs (e.g. "Nike Shoe 3" with spaces/caps),
-- which would URL-encode into exactly the ugly links this rework removes. Slug is
-- title-derived (productService keeps it in sync on create/update), so regenerating
-- all rows is correct and idempotent.
--
-- Mirrors the app's GenerateSlug: lowercase → non-[a-z0-9_] runs to '-' → collapse
-- → trim hyphens. Empty result (e.g. emoji-only titles) falls back to 'product'.
UPDATE products
SET slug = COALESCE(
  NULLIF(trim(both '-' from regexp_replace(lower(trim(title)), '[^a-z0-9_]+', '-', 'g')), ''),
  'product'
);
