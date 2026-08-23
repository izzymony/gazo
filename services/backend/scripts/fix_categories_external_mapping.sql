-- =====================================================
-- FIX CATEGORIES EXTERNAL_CATEGORY_ID TO USE UUIDs
-- =====================================================
-- This script fixes categories that store Shipbubble provider_id
-- instead of internal UUID in external_category_id column
-- =====================================================

-- Show current state before migration
SELECT '=== BEFORE MIGRATION: CATEGORIES TABLE ===' as status;

-- Count categories with invalid external_category_id (provider_id instead of UUID)
SELECT
    'Categories with provider_id in external_category_id' as issue,
    COUNT(*) as count
FROM categories c
WHERE c.external_category_id IS NOT NULL
  AND c.external_category_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM external_categories ec
    WHERE ec.id = c.external_category_id
  );

-- Show sample of problematic records
SELECT
    c.id,
    c.name as category_name,
    c.external_category_id as current_value_wrong,
    ec.id as correct_uuid,
    ec.provider_id as shipbubble_id,
    ec.name as external_category_name
FROM categories c
LEFT JOIN external_categories ec ON c.external_category_id = ec.provider_id
WHERE c.external_category_id IS NOT NULL
  AND c.external_category_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM external_categories ec2
    WHERE ec2.id = c.external_category_id
  )
LIMIT 20;

-- =====================================================
-- MIGRATION: Update categories to use UUID instead of provider_id
-- =====================================================

UPDATE categories c
SET external_category_id = ec.id
FROM external_categories ec
WHERE c.external_category_id = ec.provider_id
  AND c.external_category_id IS NOT NULL
  AND c.external_category_id != ''
  -- Ensure we're not already using UUID
  AND NOT EXISTS (
    SELECT 1 FROM external_categories ec2
    WHERE ec2.id = c.external_category_id
  );

-- Show results after migration
SELECT '=== AFTER MIGRATION: CATEGORIES TABLE ===' as status;

-- Count categories with valid UUID in external_category_id
SELECT
    'Categories with valid UUID in external_category_id' as result,
    COUNT(*) as count
FROM categories c
WHERE c.external_category_id IS NOT NULL
  AND c.external_category_id != ''
  AND EXISTS (
    SELECT 1 FROM external_categories ec
    WHERE ec.id = c.external_category_id
  );

-- Verify the fix with detailed results
SELECT
    c.id,
    c.name as category_name,
    c.external_category_id as uuid_value,
    ec.provider_id as shipbubble_id,
    ec.name as external_category_name
FROM categories c
JOIN external_categories ec ON c.external_category_id = ec.id
WHERE c.external_category_id IS NOT NULL
  AND c.external_category_id != ''
LIMIT 20;

-- Summary
SELECT '=== SUMMARY: CATEGORIES TABLE ===' as status;
SELECT
    COUNT(*) as total_categories,
    COUNT(external_category_id) FILTER (WHERE external_category_id != '') as with_external_category,
    COUNT(*) FILTER (
        WHERE external_category_id IS NOT NULL
        AND external_category_id != ''
        AND EXISTS (
            SELECT 1 FROM external_categories ec
            WHERE ec.id = external_category_id
        )
    ) as valid_uuid_mappings,
    COUNT(*) FILTER (
        WHERE external_category_id IS NOT NULL
        AND external_category_id != ''
        AND NOT EXISTS (
            SELECT 1 FROM external_categories ec
            WHERE ec.id = external_category_id
        )
    ) as invalid_mappings
FROM categories;
