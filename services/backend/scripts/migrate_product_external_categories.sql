-- =====================================================
-- MIGRATE PRODUCT EXTERNAL_CATEGORY_ID TO USE UUIDs
-- =====================================================
-- This script fixes products that store Shipbubble provider_id
-- instead of internal UUID in external_category_id column
-- =====================================================

-- Show current state before migration
SELECT '=== BEFORE MIGRATION ===' as status;
SELECT
    'Products with provider_id in external_category_id' as issue,
    COUNT(*) as count
FROM products p
WHERE p.external_category_id IS NOT NULL
  AND p.external_category_id != ''
  AND NOT EXISTS (
    SELECT 1 FROM external_categories ec
    WHERE ec.id = p.external_category_id
  );

-- Show sample of problematic records
SELECT
    p.id,
    p.title,
    p.external_category_id as current_value,
    ec.id as correct_uuid,
    ec.provider_id,
    ec.name as external_category_name
FROM products p
LEFT JOIN external_categories ec ON p.external_category_id = ec.provider_id
WHERE p.external_category_id IS NOT NULL
  AND p.external_category_id != ''
LIMIT 10;

-- =====================================================
-- MIGRATION: Update products to use UUID instead of provider_id
-- =====================================================

UPDATE products p
SET external_category_id = ec.id
FROM external_categories ec
WHERE p.external_category_id = ec.provider_id
  AND p.external_category_id IS NOT NULL
  AND p.external_category_id != ''
  -- Ensure we're not already using UUID
  AND NOT EXISTS (
    SELECT 1 FROM external_categories ec2
    WHERE ec2.id = p.external_category_id
  );

-- Show results after migration
SELECT '=== AFTER MIGRATION ===' as status;
SELECT
    'Products with valid UUID in external_category_id' as result,
    COUNT(*) as count
FROM products p
WHERE p.external_category_id IS NOT NULL
  AND p.external_category_id != ''
  AND EXISTS (
    SELECT 1 FROM external_categories ec
    WHERE ec.id = p.external_category_id
  );

-- Verify the fix with detailed results
SELECT
    p.id,
    p.title,
    p.external_category_id as uuid_value,
    ec.provider_id as shipbubble_id,
    ec.name as category_name
FROM products p
JOIN external_categories ec ON p.external_category_id = ec.id
WHERE p.external_category_id IS NOT NULL
  AND p.external_category_id != ''
LIMIT 10;

-- Summary
SELECT '=== SUMMARY ===' as status;
SELECT
    COUNT(*) as total_products,
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
FROM products;
