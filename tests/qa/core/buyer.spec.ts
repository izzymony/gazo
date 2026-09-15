import { test, expect } from "@playwright/test";
import { resolveTargets, resolveSellerCredentials } from "../env.cjs";
import { signIn, clickUntil } from "../login";

const targets = resolveTargets();

/**
 * Buyer path up to the checkout entry. Payment itself is deliberately manual for
 * launch — a Paystack round-trip is the flakiest thing to automate and its
 * webhook cannot be awaited deterministically from a browser.
 */

/** A product URL built from the API, so the journey tests are not blocked by
 *  whatever the listing pages happen to link to. */
async function seededProductPath(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get(`${targets.api}/products?page=1&limit=100`);
  const items = (await res.json())?.data?.data ?? [];
  // Must be IN STOCK: the product page's add-to-cart control is
  // `disabled={isOutOfStock}`, so picking an out-of-stock product makes the
  // click a silent no-op and the test fails for the wrong reason. Prefer a
  // seeded QA product so the run is deterministic.
  const usable = (p: any) =>
    p?.public_id && p?.business_id && p?.slug && (p?.stock ?? 0) > 0;
  const product =
    items.find((p: any) => usable(p) && /^QA Test/.test(p?.title ?? "")) ??
    items.find(usable);
  if (!product) return null;

  // The product listing carries business_id but not the store handle, so the
  // handle has to be resolved separately before a buyer URL can be built.
  const biz = await request.get(`${targets.api}/business/${product.business_id}`);
  const handle = (await biz.json())?.data?.tag;
  if (!handle) return null;

  return `/@${handle}/p/${product.slug}-${product.public_id}`;
}

test.describe("Buyer core", () => {
  test("a product page opens and renders the product", async ({ page, request }) => {
    const path = await seededProductPath(request);
    test.skip(!path, "No product with a public id — run scripts/qa/seed-staging.mjs first");

    await page.goto(path!);
    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /add to (cart|bag)/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("a product can be added to the cart", async ({ page, request }) => {
    const creds = resolveSellerCredentials();
    // The cart is tied to an account: as a guest the add silently does nothing,
    // so this signs in first rather than asserting on a no-op.
    test.skip(!creds, "Set QA_SELLER_EMAIL / QA_SELLER_PASSWORD — the cart needs an account");

    const path = await seededProductPath(request);
    test.skip(!path, "No product with a public id — seed first");

    await signIn(page, creds!.email, creds!.password);
    await page.goto(path!);

    // Retry until the store actually records it — see clickUntil.
    await clickUntil(
      page.getByRole("button", { name: /add to (cart|bag)/i }).first(),
      () =>
        page.evaluate(() => {
          try {
            const raw = localStorage.getItem("order-store");
            return !!raw && (JSON.parse(raw).state?.cart?.length ?? 0) > 0;
          } catch {
            return false;
          }
        })
    );

    await page.goto("/cart");
    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);

    // The cart's own empty-state copy is the assertion: if it is still on screen
    // after an add, nothing was added. Verified by hand against a signed-in
    // account and an in-stock product with the control enabled — the cart still
    // read "Your cart is empty."
    await expect(
      page.getByText(/your cart is empty/i),
      "Cart still shows its empty state after Add to cart — the item never landed."
    ).toHaveCount(0, { timeout: 15_000 });
  });

  /**
   * Regression guard for a defect found while building this suite: every product
   * link rendered by /shop ended in a bare dash — `/@handle/p/slug-` — because
   * lib/urlHelpers.ts builds the path with `product?.public_id || ''` and the
   * listing feeding that page returns products without a public_id. The fallback
   * turns missing data into a URL that looks valid and 404s. Every product link
   * on the page was dead.
   */
  test("product links on /shop carry a public id", async ({ page }) => {
    // Not networkidle: a Next dev server holds an HMR websocket open, so it
    // never settles and the wait burns the whole timeout. Wait for the thing
    // being asserted on instead.
    await page.goto("/shop");
    await page.locator("a[href*='/p/']").first().waitFor({ timeout: 45_000 }).catch(() => {});

    const hrefs = await page
      .locator("a[href*='/p/']")
      .evaluateAll((els) => els.map((e) => e.getAttribute("href") || ""));
    test.skip(hrefs.length === 0, "No product links on /shop — seed first");

    const malformed = hrefs.filter((h) => /-$/.test(h));
    expect(
      malformed,
      `These /shop links have an empty public id and will 404. ` +
        `lib/urlHelpers.ts falls back to '' when product.public_id is missing, ` +
        `so the listing endpoint behind /shop is not returning it.`
    ).toEqual([]);
  });
});
