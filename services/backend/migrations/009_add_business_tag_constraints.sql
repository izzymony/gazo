-- Migration: 009_add_business_tag_constraints.sql
-- Purpose: STOREFRONT-URL-REWORK — make businesses.tag the stable, public store
--   identity behind /store/{tag}: normalized, UNIQUE (case-insensitive), indexed,
--   and NOT NULL. Replaces name-based vendor resolution.
--
-- ⚠️  DELIBERATE, OWNER-RUN migration. This is NOT applied by GORM AutoMigrate
--     (the domain struct keeps `Tag string` with no gorm unique tag, on purpose —
--     see the AutoMigrate-halt-on-drift lesson). Run against STAGING first.
--
--     Step 3 (unique index) FAILS if duplicate tags remain, and Step 4 (NOT NULL)
--     FAILS if any tag is NULL/empty. That is intentional — resolve those MANUALLY
--     (rename a store's tag; no silent auto-suffix), then re-run.

-- ── Step 1: PRE-FLIGHT — inspect BEFORE changing anything (run these SELECTs) ────
--   -- (a) duplicate tags after normalization (must return 0 rows before Step 3):
--   SELECT lower(trim(both '-' from regexp_replace(lower(trim(tag)), '[^a-z0-9]+', '-', 'g'))) AS norm_tag,
--          count(*) AS n, array_agg(id) AS ids
--   FROM businesses
--   WHERE tag IS NOT NULL AND trim(tag) <> ''
--   GROUP BY norm_tag HAVING count(*) > 1;
--
--   -- (b) NULL/empty tags that will block Step 4 (assign each a valid tag first):
--   SELECT id, name FROM businesses WHERE tag IS NULL OR trim(tag) = '';

-- ── Step 2: NORMALIZE existing tags ─────────────────────────────────────────────
-- lowercase → non-[a-z0-9] runs to '-' → collapse → trim hyphens
-- (mirrors the app's GenerateSlug so tags match what the URL layer will emit).
UPDATE businesses
SET tag = trim(both '-' from regexp_replace(lower(trim(tag)), '[^a-z0-9]+', '-', 'g'))
WHERE tag IS NOT NULL AND trim(tag) <> '';

-- ── Step 3: UNIQUENESS + LOOKUP INDEX ───────────────────────────────────────────
-- One functional unique index on lower(tag): enforces case-insensitive uniqueness
-- AND serves the `WHERE LOWER(tag) = LOWER(?)` resolver in FindByTag/CountByTag.
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_tag_unique ON businesses (lower(tag));

-- ── Step 4: PRESENCE ────────────────────────────────────────────────────────────
-- Run only after Step 1(b) shows no NULL/empty tags.
ALTER TABLE businesses ALTER COLUMN tag SET NOT NULL;

-- Note: tag *format* (3–30 chars, [a-z0-9-], reserved-word protection) and
-- non-empty are enforced at the application layer (BusinessService.ValidateTag).
