-- 014 — the product taxonomy, as data the deployment owns.
--
-- Publishing a product requires a category, and the API resolves category_id and
-- sub_category_id by primary key. A database without this taxonomy cannot accept
-- a single product: staging shipped with an empty categories table and every
-- publish failed with "category not found".
--
-- Until now the only way to populate it was a MANUAL `./backend seed` on the
-- host — a step nobody can see was skipped, and one that also seeds demo users,
-- demo products and the admin bootstrap. That is the wrong shape for reference
-- data that every environment must have. This migration makes it part of
-- deployment: the ledger applies it exactly once per database, inside one
-- transaction, and records it in schema_migrations.
--
-- WHY THE IDS ARE FIXED. categories and sub_categories carry the same UUIDs the
-- production dump does (verified: all 13 category ids and all 52 sub-category
-- ids in migrations/staging/002_categories_data.sql are identical to the ones in
-- a seeded database). Re-running cannot duplicate a row, and every environment
-- ends up referring to a category by the same id. external_categories is keyed
-- on provider_id instead, the Shipbubble natural key, because that table is not
-- in the dump and a database may already hold it under ids of its own.
--
-- WHY THE LINK MATTERS. shippingService prefers a product's external_category_id
-- and, when it is empty, GUESSES a Shipbubble category from the category name
-- and the parcel dimensions. A missing link therefore produces wrong rates
-- rather than an error, so the guards at the end assert that all 13 categories
-- join to a real external_categories row, and fail the whole transaction if not.
--
-- The explicit `./backend seed` still exists for local work and manual recovery.
-- It is no longer the only way this data can arrive.

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT '70390b1b-69a0-48dc-936f-fce08a520a75', now(), now(), 'Fashion wears', 'shipbubble', '74794423'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '74794423');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT 'eb0c3b60-49aa-4ee1-b830-ef6b3e96c909', now(), now(), 'Health and beauty', 'shipbubble', '99652979'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '99652979');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT '544872ff-37fd-4ce4-815f-af0ac00af5ec', now(), now(), 'Furniture and fittings', 'shipbubble', '25590994'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '25590994');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT '26063cb5-cd12-4ae1-91e5-4485d19c8087', now(), now(), 'Light weight items', 'shipbubble', '20754594'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '20754594');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT 'b2f7dd91-289e-4f47-9186-ca6a524e500c', now(), now(), 'Hot food', 'shipbubble', '98190590'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '98190590');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT 'bf8450b7-3dfe-4f21-83bd-00977f004649', now(), now(), 'Dry food and supplements', 'shipbubble', '24032950'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '24032950');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT '1c7bc73f-016a-4df3-a338-ace9cfccead9', now(), now(), 'Groceries', 'shipbubble', '2178251'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '2178251');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT 'afc6c38c-1cd5-4e5e-800a-a46c5b9c8e40', now(), now(), 'Electronics and gadgets', 'shipbubble', '77179563'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '77179563');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT '666a3dbd-b95c-40a3-8684-ea6aabb36443', now(), now(), 'Machinery', 'shipbubble', '67008831'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '67008831');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT 'e80bf672-7f8a-4b1e-8054-116ba53a9e68', now(), now(), 'Medical supplies', 'shipbubble', '57487393'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '57487393');

INSERT INTO external_categories (id, created_at, updated_at, name, provider, provider_id)
SELECT '1de59637-e9db-4d3c-a84e-b882a1fcbc7d', now(), now(), 'Sensitive items (ATM cards, documents)', 'shipbubble', '67658572'
WHERE NOT EXISTS (SELECT 1 FROM external_categories WHERE provider_id = '67658572');

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('47320d66-8b8c-4f59-aecf-1d9ab17e1d04', now(), now(), 'Men''s Fashion', 'Clothing, shoes, and accessories for men', 'mens-fashion', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '74794423' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0', now(), now(), 'Women''s Fashion', 'Clothing, shoes, and accessories for women', 'womens-fashion', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '74794423' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('ccb79f47-ecf2-41ee-898d-228f0e9f4812', now(), now(), 'Kids Fashion', 'Clothing and accessories for children and babies', 'kids-fashion', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '74794423' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('f40cc1d7-3f08-4af9-b84f-81c37034a5a4', now(), now(), 'Beauty & Personal Care', 'Skincare, makeup, and personal care products', 'beauty-and-personal-care', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '99652979' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('00f141a5-1f21-4830-ba53-f291afe82f4b', now(), now(), 'Home & Living', 'Furniture, decor, and household items', 'home-and-living', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '25590994' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('4d90a0b8-48af-4ec6-87f5-ac0b7382433e', now(), now(), 'Food & Beverages', 'Food items, snacks, and beverages', 'food-and-beverages', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '24032950' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('a7dd1c95-f56a-45c1-b28d-1e1419ab8a68', now(), now(), 'Gadgets', 'Small electronic devices and tech accessories', 'gadgets', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '77179563' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('bc18c355-b5d1-401f-880a-ed226d6babcb', now(), now(), 'Electronics', 'Large electronics, computers, and tech equipment', 'electronics', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '77179563' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('48ca40e6-d62d-449a-b086-9363eb3eafc4', now(), now(), 'Auto & Accessories', 'Automotive parts, accessories, and car care products', 'auto-and-accessories', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '20754594' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('0a05888f-5db4-4899-92e9-7bee7d861be2', now(), now(), 'Books & Educational', 'Books, educational materials, and stationery', 'books-and-educational', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '20754594' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('1b00783c-75a1-4a4a-a92f-caf0b9b3e730', now(), now(), 'Sports & Outdoor', 'Sports equipment, fitness gear, and outdoor activities', 'sports-and-outdoor', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '20754594' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('c56df16d-7aad-4410-9629-4d190a632bdc', now(), now(), 'Music & Entertainment', 'Musical instruments, entertainment equipment, and media', 'music-and-entertainment', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '20754594' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight)
VALUES ('19c055c9-c883-45e7-97a2-9867f56e0323', now(), now(), 'Other', 'Miscellaneous items and products not fitting other categories', 'other', NULL, 'active',
        (SELECT id FROM external_categories WHERE provider_id = '20754594' LIMIT 1), 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, external_category_id = EXCLUDED.external_category_id,
  min_weight = EXCLUDED.min_weight, max_weight = EXCLUDED.max_weight, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('d12b3bf6-6cca-43a3-8861-1d1df3a7f613', now(), now(), 'Clothing', 'Men''s shirts, pants, suits, and casual wear', 'clothing', NULL, 'active', '47320d66-8b8c-4f59-aecf-1d9ab17e1d04',
        0.35, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('69fa68c2-25f3-4c92-a0ea-e80cf283e1a3', now(), now(), 'Shoes & Footwear', 'Men''s shoes, sneakers, boots, and sandals', 'shoes-and-footwear', NULL, 'active', '47320d66-8b8c-4f59-aecf-1d9ab17e1d04',
        1, 33, 22, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('a84f7c54-ae01-4942-adff-63d543571c50', now(), now(), 'Bags & Accessories', 'Men''s bags, belts, wallets, and accessories', 'bags-and-accessories', NULL, 'active', '47320d66-8b8c-4f59-aecf-1d9ab17e1d04',
        0.8, 35, 28, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('710635d0-5d6f-48c9-b783-5b9676841446', now(), now(), 'Traditional & Cultural Wear', 'Traditional Nigerian and cultural clothing for men', 'traditional-and-cultural-wear', NULL, 'active', '47320d66-8b8c-4f59-aecf-1d9ab17e1d04',
        0.6, 35, 30, 5, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('1368bc64-e1dc-4aa3-bab0-9c3f45460fdf', now(), now(), 'Activewear', 'Men''s sportswear, gym clothes, and athletic wear', 'activewear', NULL, 'active', '47320d66-8b8c-4f59-aecf-1d9ab17e1d04',
        0.4, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('f94293ed-8c87-457e-a1ad-c0bded5b8310', now(), now(), 'Clothing', 'Women''s dresses, tops, pants, and casual wear', 'clothing', NULL, 'active', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0',
        0.35, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('06d63e1a-34ad-46ee-8ac2-5b8971714227', now(), now(), 'Shoes & Footwear', 'Women''s shoes, heels, sneakers, and sandals', 'shoes-and-footwear', NULL, 'active', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0',
        1, 33, 22, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('d19257c8-5763-4cdb-88a6-0f5155c2d529', now(), now(), 'Bags & Accessories', 'Women''s handbags, purses, jewelry, and accessories', 'bags-and-accessories', NULL, 'active', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0',
        0.8, 35, 28, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('95233502-05b7-4dfd-af58-f00dc8344323', now(), now(), 'Traditional & Cultural Wear', 'Traditional Nigerian and cultural clothing for women', 'traditional-and-cultural-wear', NULL, 'active', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0',
        0.6, 35, 30, 5, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('ab901c08-020f-4c33-a459-86f88a78fd75', now(), now(), 'Activewear', 'Women''s sportswear, yoga clothes, and athletic wear', 'activewear', NULL, 'active', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0',
        0.4, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('45ede507-941d-4646-be64-6927dcae2bdf', now(), now(), 'Baby Clothing', 'Clothing for infants and toddlers', 'baby-clothing', NULL, 'active', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
        0.35, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('e7e3499a-d7c0-442c-97a6-024c418809eb', now(), now(), 'School Wear', 'School uniforms and educational clothing', 'school-wear', NULL, 'active', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
        0.35, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('969ef7dc-d5a3-4966-ab18-94563ac9fbee', now(), now(), 'Party Wear', 'Special occasion and party clothing for kids', 'party-wear', NULL, 'active', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
        0.35, 30, 25, 3, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('3eb1e87f-f4a1-4b33-9af1-5b6aaff9a375', now(), now(), 'Shoes & Footwear', 'Children''s shoes, sneakers, and sandals', 'shoes-and-footwear', NULL, 'active', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
        1, 33, 22, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('f10adf4e-2f47-400d-adb1-0b14069f8597', now(), now(), 'Bags & Accessories', 'School bags, backpacks, and kids accessories', 'bags-and-accessories', NULL, 'active', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
        0.8, 35, 28, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('cdee88bd-5950-4912-bcf7-1b559e3f8ae6', now(), now(), 'Traditional & Cultural Wear', 'Traditional Nigerian clothing for children', 'traditional-and-cultural-wear', NULL, 'active', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
        0.6, 35, 30, 5, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('a437cc48-c04e-499e-89db-1c77001d3494', now(), now(), 'Skincare', 'Face care, moisturizers, cleansers, and treatments', 'skincare', NULL, 'active', 'f40cc1d7-3f08-4af9-b84f-81c37034a5a4',
        0.25, 18, 13, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('35d6c2e7-03f4-4675-9c9c-a267249b3071', now(), now(), 'Makeup', 'Cosmetics, foundation, lipstick, and beauty tools', 'makeup', NULL, 'active', 'f40cc1d7-3f08-4af9-b84f-81c37034a5a4',
        0.25, 18, 13, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('81f3d7b3-7af9-4664-9c60-8634f05cb967', now(), now(), 'Haircare', 'Shampoos, conditioners, and hair styling products', 'haircare', NULL, 'active', 'f40cc1d7-3f08-4af9-b84f-81c37034a5a4',
        0.35, 20, 15, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('cce01696-5eed-48a5-bf91-5068eac90df4', now(), now(), 'Fragrances', 'Perfumes, colognes, and body sprays', 'fragrances', NULL, 'active', 'f40cc1d7-3f08-4af9-b84f-81c37034a5a4',
        0.25, 18, 13, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('f072f86f-dc8e-41d0-b46b-6ba192b6c778', now(), now(), 'Men''s Grooming', 'Men''s skincare, shaving, and grooming products', 'mens-grooming', NULL, 'active', 'f40cc1d7-3f08-4af9-b84f-81c37034a5a4',
        0.25, 18, 13, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('fd53671b-8810-40ac-8b31-d472dbd16d35', now(), now(), 'Personal Hygiene', 'Body care, hygiene products, and wellness items', 'personal-hygiene', NULL, 'active', 'f40cc1d7-3f08-4af9-b84f-81c37034a5a4',
        0.3, 20, 15, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('5b47775a-c152-4f2d-ae40-e17b86f3781d', now(), now(), 'Furniture', 'Tables, chairs, sofas, and large furniture items', 'furniture', NULL, 'active', '00f141a5-1f21-4830-ba53-f291afe82f4b',
        12, 80, 60, 20, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('0834d2ca-8f76-4906-8c17-506686603928', now(), now(), 'Home Decor', 'Decorative items, artwork, and home accessories', 'home-decor', NULL, 'active', '00f141a5-1f21-4830-ba53-f291afe82f4b',
        1.5, 30, 25, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('36e0a07e-aca3-4c74-ba04-337acbd96751', now(), now(), 'Kitchen & Dining', 'Kitchenware, cookware, and dining accessories', 'kitchen-and-dining', NULL, 'active', '00f141a5-1f21-4830-ba53-f291afe82f4b',
        2, 35, 30, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('e4a75022-972f-4d6d-96c9-75d1462bb6d8', now(), now(), 'Storage & Organization', 'Storage solutions and organizational products', 'storage-and-organization', NULL, 'active', '00f141a5-1f21-4830-ba53-f291afe82f4b',
        1.8, 40, 35, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('7406a44c-d1e5-4fb4-b35e-fbe38e08de80', now(), now(), 'Snacks & Confectioneries', 'Snacks, candies, chocolates, and treats', 'snacks-and-confectioneries', NULL, 'active', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
        1.2, 25, 20, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('5cc15e11-868e-4f91-a698-80ee30b4f99f', now(), now(), 'Groceries', 'Fresh groceries, produce, and everyday food items', 'groceries', NULL, 'active', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
        2, 30, 25, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('ff75bb09-febd-46be-aa62-bd37ef207142', now(), now(), 'Beverages', 'Drinks, juices, water, and beverage products', 'beverages', NULL, 'active', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
        2.5, 25, 20, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('68da0f80-7c8c-4abc-9c2a-1ea6224a3fd5', now(), now(), 'Health Foods', 'Organic foods, supplements, and health products', 'health-foods', NULL, 'active', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
        1, 25, 20, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('2460f95f-8a34-4abc-803c-2cec42f86b1c', now(), now(), 'Meal Prep & Ready-to-Eat', 'Prepared meals and ready-to-eat food items', 'meal-prep-and-ready-to-eat', NULL, 'active', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
        1.5, 30, 25, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('4e18345b-5e6e-4769-bb60-d23b8e453b48', now(), now(), 'Phone Accessories', 'Cases, chargers, cables, and phone accessories', 'phone-accessories', NULL, 'active', 'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68',
        0.3, 20, 15, 5, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('9d2227f3-66b2-4763-bbe0-484e2985990a', now(), now(), 'Wearable Technology', 'Smart watches, fitness trackers, and wearables', 'wearable-technology', NULL, 'active', 'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68',
        0.25, 18, 13, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('df1b882e-1d5f-477f-85fa-f5faabbe6bb8', now(), now(), 'Small Electronics', 'Portable gadgets and small electronic devices', 'small-electronics', NULL, 'active', 'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68',
        0.8, 25, 20, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('8b290fb1-9b0b-4778-abdf-dc7658264f18', now(), now(), 'Mobile Phones & Accessories', 'Smartphones, tablets, and mobile accessories', 'mobile-phones-and-accessories', NULL, 'active', 'bc18c355-b5d1-401f-880a-ed226d6babcb',
        0.5, 20, 15, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('bcb33329-26a9-4469-89dd-9ed609dbc74e', now(), now(), 'Computers & Laptops', 'Laptops, desktops, and computer accessories', 'computers-and-laptops', NULL, 'active', 'bc18c355-b5d1-401f-880a-ed226d6babcb',
        3.5, 45, 35, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('4b87d977-56c7-4041-952a-eae9bfa30afc', now(), now(), 'Audio & Headphones', 'Headphones, speakers, and audio equipment', 'audio-and-headphones', NULL, 'active', 'bc18c355-b5d1-401f-880a-ed226d6babcb',
        1, 30, 25, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('32208261-26f8-4846-bfa5-1724a764811a', now(), now(), 'Gaming & Console', 'Gaming consoles, controllers, and gaming accessories', 'gaming-and-console', NULL, 'active', 'bc18c355-b5d1-401f-880a-ed226d6babcb',
        2.5, 40, 30, 20, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('ed53ac39-3591-4625-8045-ee23e48f5fa1', now(), now(), 'Smart Home & IoT', 'Smart home devices and IoT products', 'smart-home-and-iot', NULL, 'active', 'bc18c355-b5d1-401f-880a-ed226d6babcb',
        1.2, 25, 20, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('20bdd3da-e053-49da-a49e-78391adfe9a5', now(), now(), 'Cameras & Photography', 'Cameras, lenses, and photography equipment', 'cameras-and-photography', NULL, 'active', 'bc18c355-b5d1-401f-880a-ed226d6babcb',
        2, 35, 28, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('2d50f7e4-23f3-4b8c-bbc5-d73bebbfaf23', now(), now(), 'Car Care & Maintenance', 'Car cleaning products, oils, and maintenance items', 'car-care-and-maintenance', NULL, 'active', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
        1.5, 25, 20, 12, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('1ed53043-a650-4795-8b50-ff7aa4f03849', now(), now(), 'Auto Parts & Tools', 'Car parts, tools, and mechanical accessories', 'auto-parts-and-tools', NULL, 'active', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
        3, 40, 30, 20, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('010590e6-af3c-4a35-a643-f0104639b13e', now(), now(), 'Auto Accessories', 'Car accessories, interior items, and decorative products', 'auto-accessories', NULL, 'active', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
        1.2, 30, 25, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('6a66aa4a-eabe-407b-adb9-915757abce29', now(), now(), 'Books & Novels', 'Fiction, non-fiction, educational, and reference books', 'books-and-novels', NULL, 'active', '0a05888f-5db4-4899-92e9-7bee7d861be2',
        0.8, 25, 20, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('46ff4201-f7f2-4064-8fda-a9bdc453aa22', now(), now(), 'Educational Supplies', 'School supplies, learning materials, and educational tools', 'educational-supplies', NULL, 'active', '0a05888f-5db4-4899-92e9-7bee7d861be2',
        1, 30, 25, 10, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('0b054e76-52eb-491a-9334-124bf36aa02c', now(), now(), 'Office & Stationery', 'Office supplies, writing materials, and stationery items', 'office-and-stationery', NULL, 'active', '0a05888f-5db4-4899-92e9-7bee7d861be2',
        0.6, 25, 20, 8, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('663a272d-83b5-4e8f-8547-5438d3667cde', now(), now(), 'Fitness Equipment', 'Exercise equipment, weights, and fitness accessories', 'fitness-equipment', NULL, 'active', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730',
        5, 50, 40, 25, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('6cb46860-92a2-416d-b982-29caa1cc7ac9', now(), now(), 'Outdoor Gear', 'Camping, hiking, and outdoor adventure equipment', 'outdoor-gear', NULL, 'active', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730',
        2.5, 40, 35, 20, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('833d9d4c-85f1-45e2-8d8d-c2641e9fb3a1', now(), now(), 'Cycling & Bicycles', 'Bicycles, cycling accessories, and bike maintenance', 'cycling-and-bicycles', NULL, 'active', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730',
        15, 150, 80, 50, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('4885a389-a214-40a5-9c6d-cc4f9336413b', now(), now(), 'Musical Instruments', 'Guitars, keyboards, drums, and musical instruments', 'musical-instruments', NULL, 'active', 'c56df16d-7aad-4410-9629-4d190a632bdc',
        3, 100, 40, 30, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('3faab719-e351-4cd1-b959-c6b5f74e6565', now(), now(), 'Concert & DJ Equipment', 'Professional audio equipment and DJ gear', 'concert-and-dj-equipment', NULL, 'active', 'c56df16d-7aad-4410-9629-4d190a632bdc',
        8, 60, 45, 25, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

INSERT INTO sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id,
        default_weight, default_length, default_width, default_height, requires_custom_shipping)
VALUES ('6c725aa1-69b7-4182-8eb4-5cd89292540a', now(), now(), 'Miscellaneous', 'General items requiring custom shipping configuration', 'miscellaneous', NULL, 'active', '19c055c9-c883-45e7-97a2-9867f56e0323',
        1, 30, 25, 15, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, slug = EXCLUDED.slug, icon = EXCLUDED.icon,
  status = EXCLUDED.status, category_id = EXCLUDED.category_id,
  default_weight = EXCLUDED.default_weight, default_length = EXCLUDED.default_length,
  default_width = EXCLUDED.default_width, default_height = EXCLUDED.default_height,
  requires_custom_shipping = EXCLUDED.requires_custom_shipping, updated_at = now();

-- Guards. Each aborts the transaction if the data did not land, so a partial

-- taxonomy can never be recorded as applied. The CAST is how a plain SQL file

-- raises a readable error without a dollar-quoted block, which the migration

-- runner's statement splitter cannot parse.

SELECT CASE WHEN (SELECT count(*) FROM external_categories WHERE provider_id IN (
    '74794423', '99652979', '25590994',
    '20754594', '98190590', '24032950',
    '2178251', '77179563', '67008831',
    '57487393', '67658572')) = 11
  THEN 1
  ELSE CAST('014 taxonomy: external categories — expected 11, found ' || (SELECT count(*) FROM external_categories WHERE provider_id IN (
    '74794423', '99652979', '25590994',
    '20754594', '98190590', '24032950',
    '2178251', '77179563', '67008831',
    '57487393', '67658572'))::text AS integer)
END;

SELECT CASE WHEN (SELECT count(*) FROM categories WHERE id IN (
    '47320d66-8b8c-4f59-aecf-1d9ab17e1d04', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
    'f40cc1d7-3f08-4af9-b84f-81c37034a5a4', '00f141a5-1f21-4830-ba53-f291afe82f4b', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
    'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68', 'bc18c355-b5d1-401f-880a-ed226d6babcb', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
    '0a05888f-5db4-4899-92e9-7bee7d861be2', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730', 'c56df16d-7aad-4410-9629-4d190a632bdc',
    '19c055c9-c883-45e7-97a2-9867f56e0323')) = 13
  THEN 1
  ELSE CAST('014 taxonomy: categories — expected 13, found ' || (SELECT count(*) FROM categories WHERE id IN (
    '47320d66-8b8c-4f59-aecf-1d9ab17e1d04', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
    'f40cc1d7-3f08-4af9-b84f-81c37034a5a4', '00f141a5-1f21-4830-ba53-f291afe82f4b', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
    'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68', 'bc18c355-b5d1-401f-880a-ed226d6babcb', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
    '0a05888f-5db4-4899-92e9-7bee7d861be2', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730', 'c56df16d-7aad-4410-9629-4d190a632bdc',
    '19c055c9-c883-45e7-97a2-9867f56e0323'))::text AS integer)
END;

SELECT CASE WHEN (SELECT count(*) FROM sub_categories WHERE id IN (
    'd12b3bf6-6cca-43a3-8861-1d1df3a7f613', '69fa68c2-25f3-4c92-a0ea-e80cf283e1a3', 'a84f7c54-ae01-4942-adff-63d543571c50',
    '710635d0-5d6f-48c9-b783-5b9676841446', '1368bc64-e1dc-4aa3-bab0-9c3f45460fdf', 'f94293ed-8c87-457e-a1ad-c0bded5b8310',
    '06d63e1a-34ad-46ee-8ac2-5b8971714227', 'd19257c8-5763-4cdb-88a6-0f5155c2d529', '95233502-05b7-4dfd-af58-f00dc8344323',
    'ab901c08-020f-4c33-a459-86f88a78fd75', '45ede507-941d-4646-be64-6927dcae2bdf', 'e7e3499a-d7c0-442c-97a6-024c418809eb',
    '969ef7dc-d5a3-4966-ab18-94563ac9fbee', '3eb1e87f-f4a1-4b33-9af1-5b6aaff9a375', 'f10adf4e-2f47-400d-adb1-0b14069f8597',
    'cdee88bd-5950-4912-bcf7-1b559e3f8ae6', 'a437cc48-c04e-499e-89db-1c77001d3494', '35d6c2e7-03f4-4675-9c9c-a267249b3071',
    '81f3d7b3-7af9-4664-9c60-8634f05cb967', 'cce01696-5eed-48a5-bf91-5068eac90df4', 'f072f86f-dc8e-41d0-b46b-6ba192b6c778',
    'fd53671b-8810-40ac-8b31-d472dbd16d35', '5b47775a-c152-4f2d-ae40-e17b86f3781d', '0834d2ca-8f76-4906-8c17-506686603928',
    '36e0a07e-aca3-4c74-ba04-337acbd96751', 'e4a75022-972f-4d6d-96c9-75d1462bb6d8', '7406a44c-d1e5-4fb4-b35e-fbe38e08de80',
    '5cc15e11-868e-4f91-a698-80ee30b4f99f', 'ff75bb09-febd-46be-aa62-bd37ef207142', '68da0f80-7c8c-4abc-9c2a-1ea6224a3fd5',
    '2460f95f-8a34-4abc-803c-2cec42f86b1c', '4e18345b-5e6e-4769-bb60-d23b8e453b48', '9d2227f3-66b2-4763-bbe0-484e2985990a',
    'df1b882e-1d5f-477f-85fa-f5faabbe6bb8', '8b290fb1-9b0b-4778-abdf-dc7658264f18', 'bcb33329-26a9-4469-89dd-9ed609dbc74e',
    '4b87d977-56c7-4041-952a-eae9bfa30afc', '32208261-26f8-4846-bfa5-1724a764811a', 'ed53ac39-3591-4625-8045-ee23e48f5fa1',
    '20bdd3da-e053-49da-a49e-78391adfe9a5', '2d50f7e4-23f3-4b8c-bbc5-d73bebbfaf23', '1ed53043-a650-4795-8b50-ff7aa4f03849',
    '010590e6-af3c-4a35-a643-f0104639b13e', '6a66aa4a-eabe-407b-adb9-915757abce29', '46ff4201-f7f2-4064-8fda-a9bdc453aa22',
    '0b054e76-52eb-491a-9334-124bf36aa02c', '663a272d-83b5-4e8f-8547-5438d3667cde', '6cb46860-92a2-416d-b982-29caa1cc7ac9',
    '833d9d4c-85f1-45e2-8d8d-c2641e9fb3a1', '4885a389-a214-40a5-9c6d-cc4f9336413b', '3faab719-e351-4cd1-b959-c6b5f74e6565',
    '6c725aa1-69b7-4182-8eb4-5cd89292540a')) = 52
  THEN 1
  ELSE CAST('014 taxonomy: sub-categories — expected 52, found ' || (SELECT count(*) FROM sub_categories WHERE id IN (
    'd12b3bf6-6cca-43a3-8861-1d1df3a7f613', '69fa68c2-25f3-4c92-a0ea-e80cf283e1a3', 'a84f7c54-ae01-4942-adff-63d543571c50',
    '710635d0-5d6f-48c9-b783-5b9676841446', '1368bc64-e1dc-4aa3-bab0-9c3f45460fdf', 'f94293ed-8c87-457e-a1ad-c0bded5b8310',
    '06d63e1a-34ad-46ee-8ac2-5b8971714227', 'd19257c8-5763-4cdb-88a6-0f5155c2d529', '95233502-05b7-4dfd-af58-f00dc8344323',
    'ab901c08-020f-4c33-a459-86f88a78fd75', '45ede507-941d-4646-be64-6927dcae2bdf', 'e7e3499a-d7c0-442c-97a6-024c418809eb',
    '969ef7dc-d5a3-4966-ab18-94563ac9fbee', '3eb1e87f-f4a1-4b33-9af1-5b6aaff9a375', 'f10adf4e-2f47-400d-adb1-0b14069f8597',
    'cdee88bd-5950-4912-bcf7-1b559e3f8ae6', 'a437cc48-c04e-499e-89db-1c77001d3494', '35d6c2e7-03f4-4675-9c9c-a267249b3071',
    '81f3d7b3-7af9-4664-9c60-8634f05cb967', 'cce01696-5eed-48a5-bf91-5068eac90df4', 'f072f86f-dc8e-41d0-b46b-6ba192b6c778',
    'fd53671b-8810-40ac-8b31-d472dbd16d35', '5b47775a-c152-4f2d-ae40-e17b86f3781d', '0834d2ca-8f76-4906-8c17-506686603928',
    '36e0a07e-aca3-4c74-ba04-337acbd96751', 'e4a75022-972f-4d6d-96c9-75d1462bb6d8', '7406a44c-d1e5-4fb4-b35e-fbe38e08de80',
    '5cc15e11-868e-4f91-a698-80ee30b4f99f', 'ff75bb09-febd-46be-aa62-bd37ef207142', '68da0f80-7c8c-4abc-9c2a-1ea6224a3fd5',
    '2460f95f-8a34-4abc-803c-2cec42f86b1c', '4e18345b-5e6e-4769-bb60-d23b8e453b48', '9d2227f3-66b2-4763-bbe0-484e2985990a',
    'df1b882e-1d5f-477f-85fa-f5faabbe6bb8', '8b290fb1-9b0b-4778-abdf-dc7658264f18', 'bcb33329-26a9-4469-89dd-9ed609dbc74e',
    '4b87d977-56c7-4041-952a-eae9bfa30afc', '32208261-26f8-4846-bfa5-1724a764811a', 'ed53ac39-3591-4625-8045-ee23e48f5fa1',
    '20bdd3da-e053-49da-a49e-78391adfe9a5', '2d50f7e4-23f3-4b8c-bbc5-d73bebbfaf23', '1ed53043-a650-4795-8b50-ff7aa4f03849',
    '010590e6-af3c-4a35-a643-f0104639b13e', '6a66aa4a-eabe-407b-adb9-915757abce29', '46ff4201-f7f2-4064-8fda-a9bdc453aa22',
    '0b054e76-52eb-491a-9334-124bf36aa02c', '663a272d-83b5-4e8f-8547-5438d3667cde', '6cb46860-92a2-416d-b982-29caa1cc7ac9',
    '833d9d4c-85f1-45e2-8d8d-c2641e9fb3a1', '4885a389-a214-40a5-9c6d-cc4f9336413b', '3faab719-e351-4cd1-b959-c6b5f74e6565',
    '6c725aa1-69b7-4182-8eb4-5cd89292540a'))::text AS integer)
END;

SELECT CASE WHEN (SELECT count(*) FROM categories c JOIN external_categories e ON e.id = c.external_category_id
  WHERE c.id IN (
    '47320d66-8b8c-4f59-aecf-1d9ab17e1d04', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
    'f40cc1d7-3f08-4af9-b84f-81c37034a5a4', '00f141a5-1f21-4830-ba53-f291afe82f4b', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
    'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68', 'bc18c355-b5d1-401f-880a-ed226d6babcb', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
    '0a05888f-5db4-4899-92e9-7bee7d861be2', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730', 'c56df16d-7aad-4410-9629-4d190a632bdc',
    '19c055c9-c883-45e7-97a2-9867f56e0323')) = 13
  THEN 1
  ELSE CAST('014 taxonomy: categories linked to a REAL external category — expected 13, found ' || (SELECT count(*) FROM categories c JOIN external_categories e ON e.id = c.external_category_id
  WHERE c.id IN (
    '47320d66-8b8c-4f59-aecf-1d9ab17e1d04', '6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0', 'ccb79f47-ecf2-41ee-898d-228f0e9f4812',
    'f40cc1d7-3f08-4af9-b84f-81c37034a5a4', '00f141a5-1f21-4830-ba53-f291afe82f4b', '4d90a0b8-48af-4ec6-87f5-ac0b7382433e',
    'a7dd1c95-f56a-45c1-b28d-1e1419ab8a68', 'bc18c355-b5d1-401f-880a-ed226d6babcb', '48ca40e6-d62d-449a-b086-9363eb3eafc4',
    '0a05888f-5db4-4899-92e9-7bee7d861be2', '1b00783c-75a1-4a4a-a92f-caf0b9b3e730', 'c56df16d-7aad-4410-9629-4d190a632bdc',
    '19c055c9-c883-45e7-97a2-9867f56e0323'))::text AS integer)
END;
