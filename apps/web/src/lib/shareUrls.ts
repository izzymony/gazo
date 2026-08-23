/**
 * Centralized URL generation for sharing products and stores.
 * Always generates public-facing URLs (never /dashboard/ dashboard URLs).
 */

const PRODUCTION_DOMAIN = 'https://myinstashop.co';

interface StoreData {
  tag?: string;
  id?: string;
  name?: string;
}

/**
 * Generate public store URL for sharing.
 * Uses /shop/{storeName} route (public marketplace).
 * @example getPublicStoreUrl({ name: 'My Store' }) => 'https://myinstashop.co/shop/My%20Store'
 */
export const getPublicStoreUrl = (store: StoreData): string => {
  const encodedStoreName = encodeURIComponent(store?.name || '');
  return `${PRODUCTION_DOMAIN}/shop/${encodedStoreName}`;
};

/**
 * Generate public product URL for sharing.
 * Always uses /shop/ route (public marketplace), never /dashboard/ (dashboard).
 * @example getPublicProductUrl('abc-123', 'My Store') => 'https://myinstashop.co/shop/My%20Store/products/abc-123'
 */
export const getPublicProductUrl = (productId: string, storeName: string): string => {
  const encodedStoreName = encodeURIComponent(storeName || '');
  return `${PRODUCTION_DOMAIN}/shop/${encodedStoreName}/products/${productId}`;
};
