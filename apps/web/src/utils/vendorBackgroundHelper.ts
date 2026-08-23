/**
 * Vendor Background Image Helper
 *
 * Provides dynamic product-based backgrounds for vendor cards
 * when no custom vendor theme is set. Uses session-consistent
 * seeding to ensure stable image selection across renders.
 *
 * Based on spotlight card implementation.
 */

interface Product {
  image?: string[];
  price?: number;
  rating?: number;
}

/**
 * Generates a session seed based on current date
 * Changes daily to provide variety while maintaining stability within a session
 */
export function generateSessionSeed(): number {
  const today = new Date().getDate();
  return Math.abs(Math.floor(today * 1000 + Math.random() * 1000)) % 10000;
}

/**
 * Gets a stable background image for a vendor based on their products
 *
 * @param vendorId - Unique identifier for the vendor
 * @param products - Array of vendor's products
 * @param sessionSeed - Session-consistent seed for stable randomization
 * @param index - Vendor's index in the list (for additional variety)
 * @returns Product image URL or null if no suitable images found
 */
export function getVendorBackgroundImage(
  vendorId: string,
  products: Product[],
  sessionSeed: number,
  index: number
): string | null {
  // Filter products that have images
  const productsWithImages = products.filter(
    (product) => product.image && product.image.length > 0
  );

  if (productsWithImages.length === 0) {
    return null;
  }

  // Sort products by performance (60% price weight, 40% rating weight)
  const sortedProducts = [...productsWithImages].sort((a, b) => {
    const priceA = a.price || 0;
    const priceB = b.price || 0;
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;

    const scoreA = priceA * 0.6 + ratingA * 0.4;
    const scoreB = priceB * 0.6 + ratingB * 0.4;

    return scoreB - scoreA; // Higher score first
  });

  // Take top 60% of performing products for variety
  const topPercentage = 0.6;
  const topCount = Math.max(1, Math.ceil(sortedProducts.length * topPercentage));
  const topPerformingProducts = sortedProducts.slice(0, topCount);

  // Use stable seeding formula to select product
  // Prime number 137 ensures good distribution
  const storeSpecificSeed = Math.abs((sessionSeed + index * 137)) % topPerformingProducts.length;
  const selectedProduct = topPerformingProducts[storeSpecificSeed];

  // Return first image of selected product
  return selectedProduct.image && selectedProduct.image.length > 0
    ? selectedProduct.image[0]
    : null;
}

/**
 * Creates a map of vendor IDs to their dynamic background images
 * Processes ALL vendors - vendor cards always use product images
 *
 * @param vendors - Array of vendor data with products
 * @param sessionSeed - Session-consistent seed
 * @returns Map of vendorId to background image URL
 */
export function createVendorBackgroundMap(
  vendors: Array<{
    id: string;
    products: Product[];
  }>,
  sessionSeed: number
): Map<string, string> {
  const backgroundMap = new Map<string, string>();

  vendors.forEach((vendor, index) => {
    const backgroundImage = getVendorBackgroundImage(
      vendor.id,
      vendor.products,
      sessionSeed,
      index
    );

    if (backgroundImage) {
      backgroundMap.set(vendor.id, backgroundImage);
    }
  });

  return backgroundMap;
}
