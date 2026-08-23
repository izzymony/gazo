/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CartsItems } from "@/lib/newinterface";
import { generateRandomHexId } from "@/lib/generator";
import { trackAddToCart } from "@/lib/analytics";

/**
 * A product has selectable variants → it can't be added straight from a card:
 * the buyer must pick size/colour (and the variant's price) on the detail page
 * first. Errs toward "true" (navigate, not instant-add) so a variant product is
 * never added at its base price. Mirrors the detail page's variant detection
 * (`variants` preferred over the `is_combination` flag, which can be stale).
 */
export function productHasVariants(product: any): boolean {
  return Boolean(
    (Array.isArray(product?.variants) && product.variants.length > 0) ||
      (Array.isArray(product?.variant_combinations) &&
        product.variant_combinations.length > 0) ||
      product?.is_combination
  );
}

/**
 * Build a cart line for a SIMPLE (variant-less) product added straight from a
 * card. Shipping is intentionally left empty — the buyer selects a delivery
 * option per item at checkout review, which both requires it (payment is
 * blocked until every item has a `shippingId`) and provides the picker. The
 * consolidator dedupes on product_id+color+shippingId+price, so re-adding the
 * same simple product just bumps its quantity.
 */
export function buildSimpleCartItem(product: any): CartsItems {
  const image = Array.isArray(product?.image) ? product.image[0] : product?.image;
  return {
    id: generateRandomHexId(16),
    product_id: `${product?.id ?? ""}`,
    business_id: product?.business_id,
    price: Number(product?.price) || 0,
    quantity: 1,
    title: product?.title ?? "",
    image: image ?? "",
    color: "",
    shippingPrice: "",
    shippingEstimate: "",
    shippingName: "",
    shippingId: "",
  };
}

/**
 * Fire the GA `add_to_cart` event for a card quick-add, matching the product
 * page's tracking so the conversion funnel counts card adds too. Quantity is 1
 * (a card adds one) and there's no variant (variant products open the detail
 * page instead), so `variant` is omitted.
 */
export function trackSimpleAddToCart(product: any) {
  trackAddToCart({
    id: `${product?.id ?? ""}`,
    name: product?.title ?? product?.name ?? "",
    price: Number(product?.price) || 0,
    quantity: 1,
    category: product?.category?.name,
  });
}
