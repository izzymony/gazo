/**
 * Canonical fixture data for the local smoke-web suite.
 *
 * Shared by the stub API (`stubApi.ts`), which answers the Next.js SERVER's
 * `serverFetch` calls, and by the specs, which assert against it. One source so
 * a test can never assert a value the stub did not actually send.
 *
 * Response envelopes follow `packages/api-client/src/unwrap.ts`:
 *   - lists  → { data: { message: "successful", data: T[] }, page, total, totalPages }
 *   - detail → { data: { message: "successful", data: T } }
 *   - `/p/:publicId` is the exception: { data: { product, combinations } }
 */

/**
 * v4-shaped uuids throughout.
 *
 * `isTaxonomyId` (apps/web/src/hooks/useCategories.ts:50) rejects anything that
 * is not `[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-…`. A product
 * payload carrying a v1 uuid fails that guard BEFORE the request is made, so a
 * submit silently no-ops with only a toast. The `4` in the version slot and the
 * `8` in the variant slot are load-bearing.
 */
export const IDS = {
  business: "b1111111-1111-4111-8111-111111111111",
  product: "c2222222-2222-4222-8222-222222222222",
  category: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  subcategory: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  user: "d3333333-3333-4333-8333-333333333333",
} as const;

/** Storefront + product URL pieces, derived the same way the app derives them. */

/**
 * 8 chars of [a-z0-9], matching PUBLIC_ID_RE in
 * `app/(buyer)/[handle]/p/[slugAndId]/page.tsx:8`. The page 404s on anything
 * else, so this is a hard constraint and not a stylistic choice.
 */
export const PUBLIC_ID = "qa123456";

export const HANDLE = "lagosthreads";

/**
 * Mirrors `slugify` in `[slugAndId]/page.tsx:19` and `productSlug` in
 * `lib/urlHelpers.ts:20`: lowercase → non-[a-z0-9_] → '-' → trim. Keeping the
 * fixture in step avoids a canonical redirect mid-test.
 */
export const PRODUCT_SLUG = "adire-wrap-dress";

/**
 * A local asset rather than a remote host.
 *
 * `next.config.mjs:43-74` allowlists `res.cloudinary.com` and `picsum.photos`
 * for the image optimizer, but both need network. Pointing at a file already in
 * `apps/web/public` keeps the suite hermetic — no request leaves the machine.
 */
export const PRODUCT_IMAGE = "/Product image (1).png";

export const PRODUCT_TITLE = "Adire Wrap Dress";

export const VENDOR = {
  id: IDS.business,
  public_id: "vend0001",
  name: "Lagos Threads",
  slug: HANDLE,
  tag: HANDLE,
  category: "Fashion & Apparels",
  logo: null,
  description: "Hand-stitched Nigerian pieces, made to order.",
  is_verified: true,
  followers_count: 128,
  average_rating: 4.6,
  product_count: 1,
  address: {
    country: "Nigeria",
    province: "Lagos",
    address_line: "12 Allen Avenue, Ikeja",
    address_line_two: null,
  },
  business_setting: {
    shipping_amount: 1500,
    shipping_type: "INSTASHOP",
    personalised_settings: {
      background_color: "#3AC61E",
      background_image: "",
      background_state: "color",
      background_pattern: "/pattern1.svg",
    },
  },
} as const;

export const PRODUCT = {
  id: IDS.product,
  public_id: PUBLIC_ID,
  business_id: IDS.business,
  title: PRODUCT_TITLE,
  slug: PRODUCT_SLUG,
  description: "A hand-dyed adire wrap dress, cut for everyday wear.",
  price: 24000,
  old_price: 30000,
  stock: 7,
  image: [PRODUCT_IMAGE],
  images: [PRODUCT_IMAGE],
  category: "Fashion & Apparels",
  category_id: IDS.category,
  sub_category_id: IDS.subcategory,
  tag: ["new-in"],
  status: "active",
  is_combination: false,
  variants: [],
  variant_combinations: [],
  rates: [5, 4],
} as const;

/**
 * The `/shop/vendors` projection.
 *
 * `ShopVendor` (businessStore.ts:38) is deliberately NOT a product record — it
 * carries `average_rating` and `followers_count` (not `rating`/`followers`), and
 * `preview_products` entries need `public_id` + `slug` or `productPath` emits
 * `/@handle/p/slug-`, a URL that looks valid and 404s (urlHelpers.ts:67).
 */
export const SHOP_VENDOR = {
  id: VENDOR.id,
  name: VENDOR.name,
  category: VENDOR.category,
  tag: VENDOR.tag,
  logo: undefined,
  is_verified: VENDOR.is_verified,
  followers_count: VENDOR.followers_count,
  average_rating: VENDOR.average_rating,
  product_count: VENDOR.product_count,
  preview_products: [
    {
      id: PRODUCT.id,
      public_id: PRODUCT.public_id,
      slug: PRODUCT.slug,
      title: PRODUCT.title,
      image: PRODUCT.image,
      price: PRODUCT.price,
      old_price: PRODUCT.old_price,
      rates: [...PRODUCT.rates],
    },
  ],
};

/** `GET /users/me` — hydrates authStore.user + businessStore.store/theme. */
export const SIGNED_IN_USER = {
  id: IDS.user,
  email: "seller@example.com",
  phone: "+2348012345678",
  firstname: "Test",
  lastname: "Seller",
  user_name: "testseller",
  business: { id: IDS.business },
};

/** List envelope: unwrap reads items from `data.data`. */
export function listEnvelope<T>(items: T[], page = 1) {
  return {
    data: { message: "successful", data: items },
    page,
    total: items.length,
    totalPages: 1,
  };
}

/** Detail envelope: `{ data: { message, data } }`. */
export function detailEnvelope<T>(item: T) {
  return { data: { message: "successful", data: item } };
}

/**
 * `/p/:publicId` nests the product under `data.product` and the variant
 * combinations under `data.combinations` — NOT the list shape. Both the server
 * resolver (`[slugAndId]/page.tsx:41-48`) and the client store
 * (productStore.ts:679-682) special-case this.
 */
export function publicProductEnvelope() {
  return {
    data: {
      product: { ...PRODUCT },
      combinations: [],
    },
  };
}

export const CATEGORIES = [
  {
    id: IDS.category,
    name: "Fashion & Apparels",
    description: "Clothing and accessories",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    sub_categories: [
      {
        id: IDS.subcategory,
        name: "Dresses",
        description: "Dresses",
        category_id: IDS.category,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
];