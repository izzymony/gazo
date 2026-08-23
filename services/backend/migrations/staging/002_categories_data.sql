--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, created_at, updated_at, name, description, slug, icon, status, external_category_id, min_weight, max_weight, shipbubble_category_id, shipbubble_provider_id) FROM stdin;
47320d66-8b8c-4f59-aecf-1d9ab17e1d04	2025-08-14 10:40:13.743465+01	2025-08-14 10:40:13.743465+01	Men's Fashion	Clothing, shoes, and accessories for men	mens-fashion	\N	active	74794423	0	0	\N	\N
6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0	2025-08-14 10:40:13.760333+01	2025-08-14 10:40:13.760333+01	Women's Fashion	Clothing, shoes, and accessories for women	womens-fashion	\N	active	74794423	0	0	\N	\N
ccb79f47-ecf2-41ee-898d-228f0e9f4812	2025-08-14 10:40:13.788644+01	2025-08-14 10:40:13.788644+01	Kids Fashion	Clothing and accessories for children and babies	kids-fashion	\N	active	74794423	0	0	\N	\N
f40cc1d7-3f08-4af9-b84f-81c37034a5a4	2025-08-14 10:40:13.842703+01	2025-08-14 10:40:13.842703+01	Beauty & Personal Care	Skincare, makeup, and personal care products	beauty-and-personal-care	\N	active	99652979	0	0	\N	\N
00f141a5-1f21-4830-ba53-f291afe82f4b	2025-08-14 10:40:13.86933+01	2025-08-14 10:40:13.86933+01	Home & Living	Furniture, decor, and household items	home-and-living	\N	active	25590994	0	0	\N	\N
4d90a0b8-48af-4ec6-87f5-ac0b7382433e	2025-08-14 10:40:13.907947+01	2025-08-14 10:40:13.907947+01	Food & Beverages	Food items, snacks, and beverages	food-and-beverages	\N	active	24032950	0	0	\N	\N
a7dd1c95-f56a-45c1-b28d-1e1419ab8a68	2025-08-14 10:40:13.931919+01	2025-08-14 10:40:13.931919+01	Gadgets	Small electronic devices and tech accessories	gadgets	\N	active	77179563	0	0	\N	\N
bc18c355-b5d1-401f-880a-ed226d6babcb	2025-08-14 10:40:13.952259+01	2025-08-14 10:40:13.952259+01	Electronics	Large electronics, computers, and tech equipment	electronics	\N	active	77179563	0	0	\N	\N
48ca40e6-d62d-449a-b086-9363eb3eafc4	2025-08-14 10:40:14.020491+01	2025-08-14 10:40:14.020491+01	Auto & Accessories	Automotive parts, accessories, and car care products	auto-and-accessories	\N	active	20754594	0	0	\N	\N
0a05888f-5db4-4899-92e9-7bee7d861be2	2025-08-14 10:40:14.051583+01	2025-08-14 10:40:14.051583+01	Books & Educational	Books, educational materials, and stationery	books-and-educational	\N	active	20754594	0	0	\N	\N
1b00783c-75a1-4a4a-a92f-caf0b9b3e730	2025-08-14 10:40:14.076983+01	2025-08-14 10:40:14.076983+01	Sports & Outdoor	Sports equipment, fitness gear, and outdoor activities	sports-and-outdoor	\N	active	20754594	0	0	\N	\N
c56df16d-7aad-4410-9629-4d190a632bdc	2025-08-14 10:40:14.097324+01	2025-08-14 10:40:14.097324+01	Music & Entertainment	Musical instruments, entertainment equipment, and media	music-and-entertainment	\N	active	20754594	0	0	\N	\N
19c055c9-c883-45e7-97a2-9867f56e0323	2025-08-14 10:40:14.108871+01	2025-08-14 10:40:14.108871+01	Other	Miscellaneous items and products not fitting other categories	other	\N	active	20754594	0	0	\N	\N
\.


--
-- Data for Name: sub_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_categories (id, created_at, updated_at, name, description, slug, icon, status, category_id, default_weight, default_length, default_width, default_height, requires_custom_shipping) FROM stdin;
d12b3bf6-6cca-43a3-8861-1d1df3a7f613	2025-08-14 10:40:13.74882+01	2025-08-14 10:40:13.74882+01	Clothing	Men's shirts, pants, suits, and casual wear	clothing	\N	active	47320d66-8b8c-4f59-aecf-1d9ab17e1d04	0.35	30	25	3	f
69fa68c2-25f3-4c92-a0ea-e80cf283e1a3	2025-08-14 10:40:13.750669+01	2025-08-14 10:40:13.750669+01	Shoes & Footwear	Men's shoes, sneakers, boots, and sandals	shoes-and-footwear	\N	active	47320d66-8b8c-4f59-aecf-1d9ab17e1d04	1	33	22	12	f
a84f7c54-ae01-4942-adff-63d543571c50	2025-08-14 10:40:13.752247+01	2025-08-14 10:40:13.752247+01	Bags & Accessories	Men's bags, belts, wallets, and accessories	bags-and-accessories	\N	active	47320d66-8b8c-4f59-aecf-1d9ab17e1d04	0.8	35	28	10	f
710635d0-5d6f-48c9-b783-5b9676841446	2025-08-14 10:40:13.754893+01	2025-08-14 10:40:13.754893+01	Traditional & Cultural Wear	Traditional Nigerian and cultural clothing for men	traditional-and-cultural-wear	\N	active	47320d66-8b8c-4f59-aecf-1d9ab17e1d04	0.6	35	30	5	f
1368bc64-e1dc-4aa3-bab0-9c3f45460fdf	2025-08-14 10:40:13.758583+01	2025-08-14 10:40:13.758583+01	Activewear	Men's sportswear, gym clothes, and athletic wear	activewear	\N	active	47320d66-8b8c-4f59-aecf-1d9ab17e1d04	0.4	30	25	3	f
f94293ed-8c87-457e-a1ad-c0bded5b8310	2025-08-14 10:40:13.764209+01	2025-08-14 10:40:13.764209+01	Clothing	Women's dresses, tops, pants, and casual wear	clothing	\N	active	6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0	0.35	30	25	3	f
06d63e1a-34ad-46ee-8ac2-5b8971714227	2025-08-14 10:40:13.768948+01	2025-08-14 10:40:13.768948+01	Shoes & Footwear	Women's shoes, heels, sneakers, and sandals	shoes-and-footwear	\N	active	6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0	1	33	22	12	f
d19257c8-5763-4cdb-88a6-0f5155c2d529	2025-08-14 10:40:13.774872+01	2025-08-14 10:40:13.774872+01	Bags & Accessories	Women's handbags, purses, jewelry, and accessories	bags-and-accessories	\N	active	6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0	0.8	35	28	10	f
95233502-05b7-4dfd-af58-f00dc8344323	2025-08-14 10:40:13.781818+01	2025-08-14 10:40:13.781818+01	Traditional & Cultural Wear	Traditional Nigerian and cultural clothing for women	traditional-and-cultural-wear	\N	active	6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0	0.6	35	30	5	f
ab901c08-020f-4c33-a459-86f88a78fd75	2025-08-14 10:40:13.784643+01	2025-08-14 10:40:13.784643+01	Activewear	Women's sportswear, yoga clothes, and athletic wear	activewear	\N	active	6c6dbe32-e847-43ac-803c-0f5e4a5c3fd0	0.4	30	25	3	f
45ede507-941d-4646-be64-6927dcae2bdf	2025-08-14 10:40:13.800173+01	2025-08-14 10:40:13.800173+01	Baby Clothing	Clothing for infants and toddlers	baby-clothing	\N	active	ccb79f47-ecf2-41ee-898d-228f0e9f4812	0.35	30	25	3	f
e7e3499a-d7c0-442c-97a6-024c418809eb	2025-08-14 10:40:13.803176+01	2025-08-14 10:40:13.803176+01	School Wear	School uniforms and educational clothing	school-wear	\N	active	ccb79f47-ecf2-41ee-898d-228f0e9f4812	0.35	30	25	3	f
969ef7dc-d5a3-4966-ab18-94563ac9fbee	2025-08-14 10:40:13.8091+01	2025-08-14 10:40:13.8091+01	Party Wear	Special occasion and party clothing for kids	party-wear	\N	active	ccb79f47-ecf2-41ee-898d-228f0e9f4812	0.35	30	25	3	f
3eb1e87f-f4a1-4b33-9af1-5b6aaff9a375	2025-08-14 10:40:13.812594+01	2025-08-14 10:40:13.812594+01	Shoes & Footwear	Children's shoes, sneakers, and sandals	shoes-and-footwear	\N	active	ccb79f47-ecf2-41ee-898d-228f0e9f4812	1	33	22	12	f
f10adf4e-2f47-400d-adb1-0b14069f8597	2025-08-14 10:40:13.816536+01	2025-08-14 10:40:13.816536+01	Bags & Accessories	School bags, backpacks, and kids accessories	bags-and-accessories	\N	active	ccb79f47-ecf2-41ee-898d-228f0e9f4812	0.8	35	28	10	f
cdee88bd-5950-4912-bcf7-1b559e3f8ae6	2025-08-14 10:40:13.828864+01	2025-08-14 10:40:13.828864+01	Traditional & Cultural Wear	Traditional Nigerian clothing for children	traditional-and-cultural-wear	\N	active	ccb79f47-ecf2-41ee-898d-228f0e9f4812	0.6	35	30	5	f
a437cc48-c04e-499e-89db-1c77001d3494	2025-08-14 10:40:13.847078+01	2025-08-14 10:40:13.847078+01	Skincare	Face care, moisturizers, cleansers, and treatments	skincare	\N	active	f40cc1d7-3f08-4af9-b84f-81c37034a5a4	0.25	18	13	8	f
35d6c2e7-03f4-4675-9c9c-a267249b3071	2025-08-14 10:40:13.849976+01	2025-08-14 10:40:13.849976+01	Makeup	Cosmetics, foundation, lipstick, and beauty tools	makeup	\N	active	f40cc1d7-3f08-4af9-b84f-81c37034a5a4	0.25	18	13	8	f
81f3d7b3-7af9-4664-9c60-8634f05cb967	2025-08-14 10:40:13.853976+01	2025-08-14 10:40:13.853976+01	Haircare	Shampoos, conditioners, and hair styling products	haircare	\N	active	f40cc1d7-3f08-4af9-b84f-81c37034a5a4	0.35	20	15	10	f
cce01696-5eed-48a5-bf91-5068eac90df4	2025-08-14 10:40:13.856628+01	2025-08-14 10:40:13.856628+01	Fragrances	Perfumes, colognes, and body sprays	fragrances	\N	active	f40cc1d7-3f08-4af9-b84f-81c37034a5a4	0.25	18	13	8	f
f072f86f-dc8e-41d0-b46b-6ba192b6c778	2025-08-14 10:40:13.862175+01	2025-08-14 10:40:13.862175+01	Men's Grooming	Men's skincare, shaving, and grooming products	mens-grooming	\N	active	f40cc1d7-3f08-4af9-b84f-81c37034a5a4	0.25	18	13	8	f
fd53671b-8810-40ac-8b31-d472dbd16d35	2025-08-14 10:40:13.865633+01	2025-08-14 10:40:13.865633+01	Personal Hygiene	Body care, hygiene products, and wellness items	personal-hygiene	\N	active	f40cc1d7-3f08-4af9-b84f-81c37034a5a4	0.3	20	15	10	f
5b47775a-c152-4f2d-ae40-e17b86f3781d	2025-08-14 10:40:13.885886+01	2025-08-14 10:40:13.885886+01	Furniture	Tables, chairs, sofas, and large furniture items	furniture	\N	active	00f141a5-1f21-4830-ba53-f291afe82f4b	12	80	60	20	f
0834d2ca-8f76-4906-8c17-506686603928	2025-08-14 10:40:13.895127+01	2025-08-14 10:40:13.895127+01	Home Decor	Decorative items, artwork, and home accessories	home-decor	\N	active	00f141a5-1f21-4830-ba53-f291afe82f4b	1.5	30	25	10	f
36e0a07e-aca3-4c74-ba04-337acbd96751	2025-08-14 10:40:13.899286+01	2025-08-14 10:40:13.899286+01	Kitchen & Dining	Kitchenware, cookware, and dining accessories	kitchen-and-dining	\N	active	00f141a5-1f21-4830-ba53-f291afe82f4b	2	35	30	15	f
e4a75022-972f-4d6d-96c9-75d1462bb6d8	2025-08-14 10:40:13.903213+01	2025-08-14 10:40:13.903213+01	Storage & Organization	Storage solutions and organizational products	storage-and-organization	\N	active	00f141a5-1f21-4830-ba53-f291afe82f4b	1.8	40	35	15	f
7406a44c-d1e5-4fb4-b35e-fbe38e08de80	2025-08-14 10:40:13.910717+01	2025-08-14 10:40:13.910717+01	Snacks & Confectioneries	Snacks, candies, chocolates, and treats	snacks-and-confectioneries	\N	active	4d90a0b8-48af-4ec6-87f5-ac0b7382433e	1.2	25	20	12	f
5cc15e11-868e-4f91-a698-80ee30b4f99f	2025-08-14 10:40:13.915318+01	2025-08-14 10:40:13.915318+01	Groceries	Fresh groceries, produce, and everyday food items	groceries	\N	active	4d90a0b8-48af-4ec6-87f5-ac0b7382433e	2	30	25	15	f
ff75bb09-febd-46be-aa62-bd37ef207142	2025-08-14 10:40:13.919254+01	2025-08-14 10:40:13.919254+01	Beverages	Drinks, juices, water, and beverage products	beverages	\N	active	4d90a0b8-48af-4ec6-87f5-ac0b7382433e	2.5	25	20	15	f
68da0f80-7c8c-4abc-9c2a-1ea6224a3fd5	2025-08-14 10:40:13.924786+01	2025-08-14 10:40:13.924786+01	Health Foods	Organic foods, supplements, and health products	health-foods	\N	active	4d90a0b8-48af-4ec6-87f5-ac0b7382433e	1	25	20	12	f
2460f95f-8a34-4abc-803c-2cec42f86b1c	2025-08-14 10:40:13.928386+01	2025-08-14 10:40:13.928386+01	Meal Prep & Ready-to-Eat	Prepared meals and ready-to-eat food items	meal-prep-and-ready-to-eat	\N	active	4d90a0b8-48af-4ec6-87f5-ac0b7382433e	1.5	30	25	10	f
4e18345b-5e6e-4769-bb60-d23b8e453b48	2025-08-14 10:40:13.936155+01	2025-08-14 10:40:13.936155+01	Phone Accessories	Cases, chargers, cables, and phone accessories	phone-accessories	\N	active	a7dd1c95-f56a-45c1-b28d-1e1419ab8a68	0.3	20	15	5	f
9d2227f3-66b2-4763-bbe0-484e2985990a	2025-08-14 10:40:13.941098+01	2025-08-14 10:40:13.941098+01	Wearable Technology	Smart watches, fitness trackers, and wearables	wearable-technology	\N	active	a7dd1c95-f56a-45c1-b28d-1e1419ab8a68	0.25	18	13	8	f
df1b882e-1d5f-477f-85fa-f5faabbe6bb8	2025-08-14 10:40:13.946776+01	2025-08-14 10:40:13.946776+01	Small Electronics	Portable gadgets and small electronic devices	small-electronics	\N	active	a7dd1c95-f56a-45c1-b28d-1e1419ab8a68	0.8	25	20	10	f
8b290fb1-9b0b-4778-abdf-dc7658264f18	2025-08-14 10:40:13.955775+01	2025-08-14 10:40:13.955775+01	Mobile Phones & Accessories	Smartphones, tablets, and mobile accessories	mobile-phones-and-accessories	\N	active	bc18c355-b5d1-401f-880a-ed226d6babcb	0.5	20	15	8	f
bcb33329-26a9-4469-89dd-9ed609dbc74e	2025-08-14 10:40:13.958755+01	2025-08-14 10:40:13.958755+01	Computers & Laptops	Laptops, desktops, and computer accessories	computers-and-laptops	\N	active	bc18c355-b5d1-401f-880a-ed226d6babcb	3.5	45	35	15	f
4b87d977-56c7-4041-952a-eae9bfa30afc	2025-08-14 10:40:13.962146+01	2025-08-14 10:40:13.962146+01	Audio & Headphones	Headphones, speakers, and audio equipment	audio-and-headphones	\N	active	bc18c355-b5d1-401f-880a-ed226d6babcb	1	30	25	12	f
32208261-26f8-4846-bfa5-1724a764811a	2025-08-14 10:40:13.976858+01	2025-08-14 10:40:13.976858+01	Gaming & Console	Gaming consoles, controllers, and gaming accessories	gaming-and-console	\N	active	bc18c355-b5d1-401f-880a-ed226d6babcb	2.5	40	30	20	f
ed53ac39-3591-4625-8045-ee23e48f5fa1	2025-08-14 10:40:13.992618+01	2025-08-14 10:40:13.992618+01	Smart Home & IoT	Smart home devices and IoT products	smart-home-and-iot	\N	active	bc18c355-b5d1-401f-880a-ed226d6babcb	1.2	25	20	10	f
20bdd3da-e053-49da-a49e-78391adfe9a5	2025-08-14 10:40:14.00284+01	2025-08-14 10:40:14.00284+01	Cameras & Photography	Cameras, lenses, and photography equipment	cameras-and-photography	\N	active	bc18c355-b5d1-401f-880a-ed226d6babcb	2	35	28	15	f
2d50f7e4-23f3-4b8c-bbc5-d73bebbfaf23	2025-08-14 10:40:14.031162+01	2025-08-14 10:40:14.031162+01	Car Care & Maintenance	Car cleaning products, oils, and maintenance items	car-care-and-maintenance	\N	active	48ca40e6-d62d-449a-b086-9363eb3eafc4	1.5	25	20	12	f
1ed53043-a650-4795-8b50-ff7aa4f03849	2025-08-14 10:40:14.044223+01	2025-08-14 10:40:14.044223+01	Auto Parts & Tools	Car parts, tools, and mechanical accessories	auto-parts-and-tools	\N	active	48ca40e6-d62d-449a-b086-9363eb3eafc4	3	40	30	20	f
010590e6-af3c-4a35-a643-f0104639b13e	2025-08-14 10:40:14.047739+01	2025-08-14 10:40:14.047739+01	Auto Accessories	Car accessories, interior items, and decorative products	auto-accessories	\N	active	48ca40e6-d62d-449a-b086-9363eb3eafc4	1.2	30	25	15	f
6a66aa4a-eabe-407b-adb9-915757abce29	2025-08-14 10:40:14.056566+01	2025-08-14 10:40:14.056566+01	Books & Novels	Fiction, non-fiction, educational, and reference books	books-and-novels	\N	active	0a05888f-5db4-4899-92e9-7bee7d861be2	0.8	25	20	8	f
46ff4201-f7f2-4064-8fda-a9bdc453aa22	2025-08-14 10:40:14.065684+01	2025-08-14 10:40:14.065684+01	Educational Supplies	School supplies, learning materials, and educational tools	educational-supplies	\N	active	0a05888f-5db4-4899-92e9-7bee7d861be2	1	30	25	10	f
0b054e76-52eb-491a-9334-124bf36aa02c	2025-08-14 10:40:14.071855+01	2025-08-14 10:40:14.071855+01	Office & Stationery	Office supplies, writing materials, and stationery items	office-and-stationery	\N	active	0a05888f-5db4-4899-92e9-7bee7d861be2	0.6	25	20	8	f
663a272d-83b5-4e8f-8547-5438d3667cde	2025-08-14 10:40:14.082468+01	2025-08-14 10:40:14.082468+01	Fitness Equipment	Exercise equipment, weights, and fitness accessories	fitness-equipment	\N	active	1b00783c-75a1-4a4a-a92f-caf0b9b3e730	5	50	40	25	f
6cb46860-92a2-416d-b982-29caa1cc7ac9	2025-08-14 10:40:14.088672+01	2025-08-14 10:40:14.088672+01	Outdoor Gear	Camping, hiking, and outdoor adventure equipment	outdoor-gear	\N	active	1b00783c-75a1-4a4a-a92f-caf0b9b3e730	2.5	40	35	20	f
833d9d4c-85f1-45e2-8d8d-c2641e9fb3a1	2025-08-14 10:40:14.094616+01	2025-08-14 10:40:14.094616+01	Cycling & Bicycles	Bicycles, cycling accessories, and bike maintenance	cycling-and-bicycles	\N	active	1b00783c-75a1-4a4a-a92f-caf0b9b3e730	15	150	80	50	f
4885a389-a214-40a5-9c6d-cc4f9336413b	2025-08-14 10:40:14.102293+01	2025-08-14 10:40:14.102293+01	Musical Instruments	Guitars, keyboards, drums, and musical instruments	musical-instruments	\N	active	c56df16d-7aad-4410-9629-4d190a632bdc	3	100	40	30	f
3faab719-e351-4cd1-b959-c6b5f74e6565	2025-08-14 10:40:14.104082+01	2025-08-14 10:40:14.104082+01	Concert & DJ Equipment	Professional audio equipment and DJ gear	concert-and-dj-equipment	\N	active	c56df16d-7aad-4410-9629-4d190a632bdc	8	60	45	25	f
6c725aa1-69b7-4182-8eb4-5cd89292540a	2025-08-14 10:40:14.114531+01	2025-08-14 10:40:14.114531+01	Miscellaneous	General items requiring custom shipping configuration	miscellaneous	\N	active	19c055c9-c883-45e7-97a2-9867f56e0323	1	30	25	15	f
\.


--
-- PostgreSQL database dump complete
--

