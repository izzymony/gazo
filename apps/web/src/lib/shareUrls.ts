/**
 * Centralized public URL generation for stores and products (STOREFRONT-URL-REWORK).
 * Emits the tag/id scheme — /store/{tag} and /store/{tag}/products/{slug}--{id} —
 * never the legacy name-based /shop/{name} links or /dashboard/ URLs. This is the
 * single place link generation lives; every share/OG/email emitter goes through it.
 */

const PRODUCTION_DOMAIN = 'https://vibaar.com';

interface StoreData {
  tag?: string;
  id?: string;
  name?: string;
}

interface ProductData {
  id?: string;
  public_id?: string;
  slug?: string;
  title?: string;
}

// Mirrors the backend GenerateSlug (lowercase → non-[a-z0-9_] → '-' → collapse →
// trim); empty (emoji-only titles) → 'product'. The URL resolves by the id, so the
// slug is cosmetic — but keeping it in sync avoids a canonical redirect on click.
const slugify = (title?: string): string => {
  const s = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'product';
};

/**
 * Public store URL: /@{handle}.
 * @example getPublicStoreUrl({ tag: 'bukky-styles' }) => 'https://vibaar.com/@bukky-styles'
 */
export const getPublicStoreUrl = (store: StoreData): string => {
  return `${PRODUCTION_DOMAIN}/@${store?.tag || ''}`;
};

/**
 * Public product URL: /@{handle}/p/{slug}-{publicId} (Rev 2).
 * @example getPublicProductUrl({ public_id: 'k7x9a2q1', title: 'Nike Air' }, { tag: 'bukky-styles' })
 *          => 'https://vibaar.com/@bukky-styles/p/nike-air-k7x9a2q1'
 */
export const getPublicProductUrl = (
  product: ProductData,
  store: StoreData
): string => {
  const slug = product?.slug || slugify(product?.title);
  return `${PRODUCTION_DOMAIN}/@${store?.tag || ''}/p/${slug}-${product?.public_id || ''}`;
};
