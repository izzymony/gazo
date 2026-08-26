/**
 * Relative in-app path builders for the tag/id URL scheme (STOREFRONT-URL-REWORK).
 * Use these for `router.push` / `<Link href>` navigation *inside* the app.
 * For external share / OG / email links (absolute, with domain) use shareUrls.ts.
 */

interface StoreLike {
  tag?: string;
}
interface ProductLike {
  id?: string;
  slug?: string;
  title?: string;
}

// Mirrors the backend GenerateSlug: lowercase → non-[a-z0-9_] → '-' → collapse →
// trim; empty → 'product'. Slug is cosmetic (the id resolves) but keeping it in
// sync avoids a canonical redirect on click.
export const productSlug = (product?: ProductLike): string => {
  if (product?.slug) return product.slug;
  const s = (product?.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'product';
};

/** In-app path to a vendor storefront: /store/{tag}. */
export const storePath = (store?: StoreLike | null): string => `/store/${store?.tag || ''}`;

/** In-app path to a product: /store/{tag}/products/{slug}--{id}. */
export const productPath = (
  store: StoreLike | null | undefined,
  product: ProductLike
): string =>
  `/store/${store?.tag || ''}/products/${productSlug(product)}--${product?.id || ''}`;
