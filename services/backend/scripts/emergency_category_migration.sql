-- ⚠️ EMERGENCY CATEGORY MIGRATION SCRIPT
-- This script fixes existing products with broken category/subcategory references
-- Created: August 14, 2025
-- Purpose: Migrate old category IDs to new 13-category system

-- First, let's identify the problem products
-- Check existing products with invalid category references
SELECT 'BEFORE MIGRATION - Products with invalid categories:' as status;
SELECT COUNT(*) as broken_products FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE c.id IS NULL;

-- Show specific broken products
SELECT p.id, p.title, p.category_id as old_category_id, 'BROKEN' as status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id  
WHERE c.id IS NULL;

-- MIGRATION PLAN:
-- Map old category IDs to new category system based on product context

-- Step 1: Get new category IDs for mapping
SELECT 'NEW CATEGORIES:' as info;
SELECT id, name, slug FROM categories ORDER BY name;

-- Step 2: Update products with old Electronics category ID to new Gadgets
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'gadgets'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'smartphones-tablets' AND category_id = (SELECT id FROM categories WHERE slug = 'gadgets'))
WHERE category_id = 'c5fdc257-f40b-4ab4-be46-5cde58ff79c2'
  AND (title ILIKE '%phone%' OR title ILIKE '%mobile%' OR title ILIKE '%iphone%' OR title ILIKE '%samsung%');

-- Step 3: Update remaining electronics products to Electronics category  
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'electronics'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'smart-home-devices' AND category_id = (SELECT id FROM categories WHERE slug = 'electronics'))
WHERE category_id = 'c5fdc257-f40b-4ab4-be46-5cde58ff79c2';

-- Step 4: Update products with old Fashion category ID
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'mens-fashion'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'clothing' AND category_id = (SELECT id FROM categories WHERE slug = 'mens-fashion'))
WHERE category_id = '9aebee99-0435-4ca1-bf82-7657bd35691a'
  AND (title ILIKE '%men%' OR title ILIKE '%shirt%' OR title ILIKE '%jean%');

-- Update remaining fashion products to Women's Fashion
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'womens-fashion'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'clothing' AND category_id = (SELECT id FROM categories WHERE slug = 'womens-fashion'))
WHERE category_id = '9aebee99-0435-4ca1-bf82-7657bd35691a';

-- Step 5: Update products with old Home & Garden category ID
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'home-living'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'furniture' AND category_id = (SELECT id FROM categories WHERE slug = 'home-living'))
WHERE category_id = '0008ccd9-1119-46c4-be2c-0b219d090bf8'
  AND (title ILIKE '%furniture%' OR title ILIKE '%table%' OR title ILIKE '%chair%' OR title ILIKE '%sofa%');

-- Update remaining home products to home decor
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'home-living'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'home-decor' AND category_id = (SELECT id FROM categories WHERE slug = 'home-living'))
WHERE category_id = '0008ccd9-1119-46c4-be2c-0b219d090bf8';

-- Step 6: Update products with old Books category ID
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'books-educational'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'books-novels' AND category_id = (SELECT id FROM categories WHERE slug = 'books-educational'))
WHERE category_id = '695d1642-bfaa-400a-95a7-38509c1e307f';

-- Step 7: Update products with old Food & Beverages category ID
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'food-beverages'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'snacks-confectioneries' AND category_id = (SELECT id FROM categories WHERE slug = 'food-beverages'))
WHERE category_id = 'cb89a32d-f8af-425d-a579-3f7b26dd9671';

-- Step 8: Handle any remaining orphaned products - assign to "Other"
UPDATE products SET 
  category_id = (SELECT id FROM categories WHERE slug = 'other'),
  sub_category_id = (SELECT id FROM sub_categories WHERE slug = 'custom-items' AND category_id = (SELECT id FROM categories WHERE slug = 'other'))
WHERE category_id NOT IN (SELECT id FROM categories);

-- Step 9: Update products with invalid subcategory references
UPDATE products SET 
  sub_category_id = (SELECT id FROM sub_categories WHERE category_id = products.category_id LIMIT 1)
WHERE sub_category_id NOT IN (SELECT id FROM sub_categories);

-- Step 10: Ensure all products have external_category_id for shipping
UPDATE products SET 
  external_category_id = (SELECT shipbubble_category_id FROM categories WHERE id = products.category_id)
WHERE external_category_id IS NULL OR external_category_id = '';

-- Step 11: Add shipping dimensions for products without them
UPDATE products SET 
  shipping_length_cm = COALESCE(length, (SELECT shipping_length_cm FROM sub_categories WHERE id = products.sub_category_id), 30.0),
  shipping_width_cm = COALESCE(width, (SELECT shipping_width_cm FROM sub_categories WHERE id = products.sub_category_id), 25.0),
  shipping_height_cm = COALESCE(height, (SELECT shipping_height_cm FROM sub_categories WHERE id = products.sub_category_id), 15.0),
  shipping_weight_kg = COALESCE(weight, (SELECT shipping_weight_kg FROM sub_categories WHERE id = products.sub_category_id), 2.0)
WHERE shipping_length_cm IS NULL OR shipping_width_cm IS NULL OR shipping_height_cm IS NULL OR shipping_weight_kg IS NULL;

-- VERIFICATION: Check results after migration
SELECT 'AFTER MIGRATION - Product category status:' as status;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as products_with_valid_categories FROM products p
JOIN categories c ON p.category_id = c.id;
SELECT COUNT(*) as products_with_valid_subcategories FROM products p
JOIN sub_categories sc ON p.sub_category_id = sc.id;

-- Show category distribution after migration
SELECT c.name as category, COUNT(*) as product_count
FROM products p
JOIN categories c ON p.category_id = c.id
GROUP BY c.name
ORDER BY product_count DESC;

-- Final validation
SELECT 'MIGRATION COMPLETE - All products should now have valid categories' as final_status;