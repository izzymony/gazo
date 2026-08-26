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
 * Public store URL: /store/{tag}.
 * @example getPublicStoreUrl({ tag: 'bukky-styles' }) => 'https://vibaar.com/store/bukky-styles'
 */
export const getPublicStoreUrl = (store: StoreData): string => {
  return `${PRODUCTION_DOMAIN}/store/${store?.tag || ''}`;
};

/**
 * Public product URL: /store/{tag}/products/{slug}--{id}.
 * Accepts a product object (preferred) or a bare id string for back-compat.
 * @example getPublicProductUrl({ id: 'abc', title: 'Nike Air' }, { tag: 'bukky-styles' })
 *          => 'https://vibaar.com/store/bukky-styles/products/nike-air--abc'
 */
export const getPublicProductUrl = (
  product: ProductData | string,
  store: StoreData
): string => {
  const id = typeof product === 'string' ? product : product?.id || '';
  const slug =
    typeof product === 'string'
      ? 'product'
      : product?.slug || slugify(product?.title);
  return `${PRODUCTION_DOMAIN}/store/${store?.tag || ''}/products/${slug}--${id}`;
};
