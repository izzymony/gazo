-- =====================================================
-- FIX EXTERNAL CATEGORY MAPPINGS FOR SHIPPING
-- =====================================================
-- This script fixes the mismatch between product external_category_id 
-- and the actual UUIDs in the external_categories table
-- =====================================================

-- Show current state before fix
SELECT 'BEFORE FIX: Products with invalid external_category_id' as status;
SELECT p.id, p.title, p.external_category_id, c.name as category_name 
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.external_category_id IS NOT NULL OR p.external_category_id = '';

-- 1. Update Electronics products (5 products)
-- Map to "Electronics and gadgets" external category
UPDATE products 
SET external_category_id = 'afc6c38c-1cd5-4e5e-800a-a46c5b9c8e40'
WHERE category_id = 'bc18c355-b5d1-401f-880a-ed226d6babcb';

-- 2. Update Men's Fashion products (1 product)
-- Map to "Fashion wears" external category
UPDATE products 
SET external_category_id = '70390b1b-69a0-48dc-936f-fce08a520a75'
WHERE category_id = '47320d66-8b8c-4f59-aecf-1d9ab17e1d04';

-- 3. Update Other category products (3 products - Nike shoes)
-- Map to "Fashion wears" since they are shoes
UPDATE products 
SET external_category_id = '70390b1b-69a0-48dc-936f-fce08a520a75'
WHERE category_id = '19c055c9-c883-45e7-97a2-9867f56e0323'
AND title LIKE '%Nike%';

-- 4. Update any remaining "Other" category products to "Light weight items"
UPDATE products 
SET external_category_id = '26063cb5-cd12-4ae1-91e5-4485d19c8087'
WHERE category_id = '19c055c9-c883-45e7-97a2-9867f56e0323'
AND external_category_id IS NULL;

-- Verify the fix
SELECT 'AFTER FIX: All products should have valid external_category_id' as status;
SELECT 
    p.title,
    c.name as category,
    ec.name as external_category,
    ec.provider_id as shipbubble_id
FROM products p
JOIN categories c ON p.category_id = c.id
LEFT JOIN external_categories ec ON p.external_category_id = ec.id
ORDER BY c.name, p.title;

-- Summary
SELECT 'SUMMARY' as status;
SELECT 
    COUNT(*) as total_products,
    COUNT(external_category_id) as with_external_category,
    COUNT(CASE WHEN external_category_id IS NULL THEN 1 END) as missing_external_category
FROM products;