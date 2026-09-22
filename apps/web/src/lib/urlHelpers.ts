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
  public_id?: string;
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

/**
 * Read a store handle out of a captured `[handle]` route param.
 *
 * The param arrives PERCENT-ENCODED: Next hands `useParams()` the raw segment,
 * so `/@localstore2` is `"%40localstore2"`, not `"@localstore2"`. Decoding is
 * therefore not optional. The client product page skipped it and stripped the
 * '@' with a regex that no longer matched, then re-encoded the result — asking
 * the API for the tag `%40localstore2`, which 404s. That 404 both raised a
 * "store not found" toast on every product view and NULLED the correct,
 * already-resolved vendor, so the page fell back to whatever store was in
 * state (for a signed-in seller: their own).
 *
 * Returns null when the segment is not a store handle (no leading '@'), which
 * is how a top-level path is distinguished from a storefront.
 */
export const parseStoreHandle = (param?: string | null): string | null => {
  if (!param) return null;
  const handle = decodeURIComponent(param).toLowerCase();
  return handle.startsWith('@') ? handle.slice(1) : null;
};

/** In-app path to a vendor storefront: /@{handle}. */
export const storePath = (store?: StoreLike | null): string => `/@${store?.tag || ''}`;

/**
 * In-app path to a product: /@{handle}/p/{slug}-{publicId} (Rev 2).
 *
 * The empty-string fallbacks are kept so this never throws mid-render, but they
 * produce a URL that LOOKS valid and 404s — `/@handle/p/slug-`. That shipped
 * across every product link on /shop, because the callers were mapping
 * preview products field-by-field and had dropped `public_id`; the slug looked
 * right only because productSlug regenerates it from the title. So in
 * development, say so loudly rather than emitting a dead link in silence.
 */
export const productPath = (
  store: StoreLike | null | undefined,
  product: ProductLike
): string => {
  if (process.env.NODE_ENV !== 'production' && !product?.public_id) {
    console.error(
      `[productPath] product "${product?.title ?? product?.id ?? 'unknown'}" has no public_id — ` +
        `the link will 404. Whatever built this object dropped the field.`
    );
  }
  return `/@${store?.tag || ''}/p/${productSlug(product)}-${product?.public_id || ''}`;
};
