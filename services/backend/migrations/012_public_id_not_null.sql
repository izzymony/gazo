-- Migration: 012_public_id_not_null.sql
-- Purpose: STOREFRONT-URL-REWORK — harden products.public_id. 011 added the column,
--   backfilled it, and created the unique index; the app now generates one on every
--   product create (helper.GeneratePublicID). Enforce NOT NULL so a product can never
--   exist without a public id — the buyer product URL (/@{handle}/p/{slug}-{publicId})
--   depends on it. The unique index from 011 stays.
--
-- ⚠️  DELIBERATE, OWNER-RUN migration (not GORM AutoMigrate). Run 011 FIRST.
--     Run against STAGING before PROD.

-- Safety net: fill any straggler created between 011 and this migration (the app sets
-- one on create, but a manual/raw insert might not have). Same generator shape as 011.
UPDATE products
SET public_id = substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 10)
WHERE public_id IS NULL OR public_id = '';

-- Enforce the invariant.
ALTER TABLE products ALTER COLUMN public_id SET NOT NULL;
