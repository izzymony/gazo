import { test, expect } from "@playwright/test";

import { gotoRoute } from "./helpers/nav";
import { PRODUCT, VENDOR } from "./helpers/fixtures";

/**
 * Cart.
 *
 * There is no cart API. `useOrderStore` persists the whole cart to localStorage
 * under the key `order-store` (apps/web/src/store/orderStore.ts:834), so
 * rendering `/cart` issues no cart request at all — every path here either seeds
 * localStorage before first paint or drives the real UI.
 *
 * `partialize` keeps everything but `isLoading`/`error` (orderStore.ts:839), and
 * a `merge` forces transient flags back to their initial values, so the seed only
 * has to carry state: `carts`, `cart`, `checkoutCart`.
 */

/** One cart line, in the shape `addToCarts` produces. */
function cartLine(quantity: number) {
  return {
    product_id: PRODUCT.id,
    business_id: VENDOR.id,
    title: PRODUCT.title,
    image: PRODUCT.image,
    price: PRODUCT.price,
    old_price: PRODUCT.old_price,
    quantity,
    public_id: PRODUCT.public_id,
    slug: PRODUCT.slug,
    variants: [],
  };
}

test.describe("Cart", () => {
  // The group heading above the line items is NOT read off the cart line.
  // `cart/page.tsx:178` does `stores.find((itc) => itc.id === business_id)` and
  // falls back to the literal "Vendor name" when there is no match — so
  // `business: { name }` in the seed below is dead weight, and the only way the
  // real store name appears is by satisfying that fetch. `stores` is not
  // persisted (`partialize` at businessStore.ts:2170 keeps only transient flags),
  // so it always arrives over the wire on mount via `fetchStores()` →
  // `GET /businesses?limit=500` (businessStore.ts:1572).
  //
  // `fetchProducts()` also fires on mount (cart/page.tsx:199) and is NOT mocked
  // here, so it reaches whatever is on :8088. That was the source of the
  // intermittent failures: the seeded line is rendered from the store, but a slow
  // or erroring products fetch perturbed hydration timing, and the test lost the
  // race for its first assertion. Serving it explicitly makes the file's results
  // independent of whether a backend happens to be running.
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/businesses**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { message: "successful", data: [VENDOR] } }),
      })
    );

    await page.route("**/api/v1/products**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { message: "successful", data: [PRODUCT] } }),
      })
    );
  });

  test("shows the empty state with nothing stored", async ({ page }) => {
    await gotoRoute(page, "/cart");

    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await expect(page.getByText("Proceed to checkout")).toHaveCount(0);
  });

  test("renders a seeded cart line and its total", async ({ page }) => {
    await page.addInitScript((line) => {
      window.localStorage.setItem(
        "order-store",
        JSON.stringify({
          state: {
            carts: [
              {
                business_id: "b1111111-1111-4111-8111-111111111111",
                business: { name: "Lagos Threads" },
                products: [line],
              },
            ],
            cart: [line],
            checkoutCart: [],
            orders: [],
            order: null,
            isLoading: false,
            error: null,
          },
          version: 0,
        })
      );
    }, cartLine(2));

    await gotoRoute(page, "/cart");

    await expect(page.getByText(PRODUCT.title)).toBeVisible();
    // Store name is the group heading above the line items (cart/page.tsx).
    await expect(page.getByText(VENDOR.name)).toBeVisible();

    // `Total ({n}):` — n is the number of groups, not line items.
    await expect(page.getByText(/Total \(1\):/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Proceed to checkout" })).toBeVisible();

    // Row controls. The trash/"Remove item" variant only replaces the stepper at
    // quantity 0 (cart/page.tsx:285), so at 2 both stepper buttons are expected.
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decrease quantity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove item" })).toHaveCount(0);
  });

  test("decrementing to zero then removing empties the cart", async ({ page }) => {
    await page.addInitScript((line) => {
      window.localStorage.setItem(
        "order-store",
        JSON.stringify({
          state: {
            carts: [
              {
                business_id: "b1111111-1111-4111-8111-111111111111",
                business: { name: "Lagos Threads" },
                products: [line],
              },
            ],
            cart: [line],
            checkoutCart: [],
            orders: [],
            order: null,
            isLoading: false,
            error: null,
          },
          version: 0,
        })
      );
    }, cartLine(1));

    await gotoRoute(page, "/cart");

    // Decrementing the last unit does NOT empty the cart: `decrement` clamps at
    // 0 and keeps the line (cart/page.tsx:255). So the first click only moves the
    // row into its "to be removed" state.
    await expect(page.getByText(PRODUCT.title)).toBeVisible();
    await page.getByRole("button", { name: "Decrease quantity" }).click();

    // Only at quantity 0 does the control swap to Remove (cart/page.tsx:285).
    // Asserting this after the click — rather than assuming it — is what catches
    // the row never having left quantity 1.
    const remove = page.getByRole("button", { name: "Remove item" });
    await expect(remove).toBeVisible();

    // And the line is still listed: zeroed, not gone.
    await expect(page.getByText(PRODUCT.title)).toBeVisible();

    // That click is the one that deletes, via `removeCartItem`
    // (cart/page.tsx:247), because quantity is already 0.
    await remove.click();

    // The meaningful assertion: the cart is GONE, not merely the line hidden.
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Proceed to checkout" })).toHaveCount(0);
  });
});