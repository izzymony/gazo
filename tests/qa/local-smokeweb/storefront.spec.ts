import { test, expect } from "@playwright/test";

import { clickUntil, gotoRoute } from "./helpers/nav";
import { requireStub } from "./helpers/stubApi";
import { HANDLE, PRODUCT, VENDOR } from "./helpers/fixtures";

/**
 * Storefront and product detail.
 *
 * These are the two routes `page.route` CANNOT reach. Both resolve their data in
 * the Next server through `serverFetch` (packages/api-client/src/serverFetch.ts),
 * which returns `null` on failure — after which each page calls `notFound()`.
 * So these specs are only meaningful against the stub on :8088 that
 * helpers/stubApi.ts serves; there is no `context.route` in this file, and
 * adding one would be a no-op that reads as if the data were controlled.
 *
 * Note the asymmetry worth keeping in mind when these fail: a broken FIXTURE here
 * looks exactly like a broken page, because both end at `notFound()`.
 */

// Every test here needs the SSR stub, so gate the whole file on it once.
// Without this the failure surfaces as `heading "Page not found"` on a store
// that was never in any fixture — a product-looking bug with a harness cause.
test.beforeEach(async ({ request }) => {
  await requireStub(request);
});

test.describe("Storefront", () => {
  test("a known handle renders the vendor storefront", async ({ page }) => {
    // No mocks. The server-resolved store arrives from the stub.
    await gotoRoute(page, `/@${HANDLE}`);

    // `[handle]/page.tsx:94` emits exactly one screen-reader h1 for the store.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(VENDOR.name);

    // Tabs come from StoreTabs; Products is the default panel.
    await expect(page.getByRole("tab", { name: "Products" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Deals" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Reviews" })).toBeVisible();

    // The grid is server-primed from `/products?business_id=`
    // (`[handle]/page.tsx:33`), so this title arriving proves the SSR path
    // resolved — the strongest available signal that the stub is wired.
    await expect(page.getByRole("link", { name: PRODUCT.title })).toBeVisible();

    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);
  });

  test("an unknown handle renders not-found", async ({ page }) => {
    // The stub 404s `/businesses/by-tag/{handle}`, `serverFetch` maps a
    // non-ok response to `null`, and `[handle]/page.tsx:70` calls notFound().
    await gotoRoute(page, "/@no-such-store");

    await expect(page.getByText("Page not found", { exact: false }).first()).toBeVisible();
    // The soft-404: Next still answers 200, so only the body tells the truth.
    expect(page.url()).toContain("/@no-such-store");
  });
});

test.describe("Product detail", () => {
  test("a known product renders its purchase controls", async ({ page }) => {
    // `public_id` must be 8–10 chars of [a-z0-9] or `parsePublicId` returns
    // null and the page 404s before fetching anything
    // (`[slugAndId]/page.tsx:8,15`).
    await gotoRoute(page, `/@${HANDLE}/p/${PRODUCT.slug}-${PRODUCT.public_id}`);

    await expect(page.getByRole("heading", { level: 1, name: PRODUCT.title })).toBeVisible();
    await expect(page.getByText(PRODUCT.description)).toBeVisible();

    // `isOutOfStock` is `Number(stock) <= 0` (Product.tsx:346) — these are the
    // live labels, and "Out of stock" would mean the fixture's stock went missing.
    await expect(page.getByRole("button", { name: "Buy now" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Decrease quantity" })).toBeEnabled();

    await expect(page.getByText("Out of stock")).toHaveCount(0);
  });

  test("the quantity stepper increments", async ({ page }) => {
    await gotoRoute(page, `/@${HANDLE}/p/${PRODUCT.slug}-${PRODUCT.public_id}`);

    // The count is a bare <span> with no label, so it is selected structurally.
    // Order in ProductCTA.tsx:76-92 is Decrease → count → Increase, so from the
    // Increase button the count is the PRECEDING sibling (an earlier version
    // looked for a following sibling and never matched).
    const stepper = page.getByRole("button", { name: "Increase quantity" });
    const count = stepper.locator("xpath=preceding-sibling::span[1]");
    await expect(count).toHaveText("1");

    // Retry the click until the count moves. A single click is a coin flip:
    // `gotoRoute` returns at `domcontentloaded`, and a click that lands before
    // hydration reaches inert markup — no error, no increment — which is what
    // made this test fail roughly 1 run in 30. Retrying measures the app
    // instead of the timing of hydration.
    await clickUntil(stepper, async () => (await count.textContent()) === "2");

    // The stepper is a counter, not a one-shot: prove it actually tracks state
    // by stepping again rather than settling for one increment.
    await clickUntil(stepper, async () => (await count.textContent()) === "3");
  });

  test("an unknown public id renders not-found", async ({ page }) => {
    await gotoRoute(page, `/@${HANDLE}/p/some-product-zzzz9999`);

    await expect(page.getByText("Page not found", { exact: false }).first()).toBeVisible();
  });
});