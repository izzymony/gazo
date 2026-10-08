import { test, expect } from "@playwright/test";
import { requireSellerCredentials } from "../env.cjs";
import { clickUntil, gotoRoute } from "../login";
import { apiToken, storefrontFor } from "./helpers/staging";

/**
 * Storefront and product detail against LIVE staging data.
 *
 * The local counterpart (tests/qa/local-smokeweb/storefront.spec.ts) asserts
 * fixture constants — a vendor and a product that exist nowhere else — which is
 * exactly why it cannot run here. These resolve the store, the handle, the
 * product and its slug from the API first, so every value asserted is one the
 * environment actually holds.
 *
 * This is also the only coverage these two routes get at all. Both resolve their
 * data in the Next SERVER through `serverFetch`, which returns null on failure
 * and is followed by `notFound()` — so `page.route` cannot reach them at all,
 * and a failure here looks exactly like a broken page.
 */

const creds = requireSellerCredentials();

test.describe("Storefront on live staging", () => {
  test("the seller's real store renders its real products", async ({ page, request }) => {
    const token = await apiToken(request, creds.email, creds.password);
    const store = await storefrontFor(request, token);

    await gotoRoute(page, `/@${store.handle}`);

    // `[handle]/page.tsx` emits exactly one screen-reader h1 for the store.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(store.storeName, {
      timeout: 45_000,
    });

    await expect(page.getByRole("tab", { name: "Products" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Deals" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Reviews" })).toBeVisible();

    /**
     * The grid is server-primed from `/products?business_id=`, so this title
     * arriving proves the SSR path resolved against real staging data — the
     * strongest signal available here that the store really rendered.
     */
    const card = page.getByRole("link", { name: store.product.title as string }).first();
    await expect(card, `${store.storeName} (/@${store.handle}) did not list "${store.product.title}"`).toBeVisible({
      timeout: 45_000,
    });

    const dealsTab = page.getByRole("tab", { name: "Deals" });
    await dealsTab.click();
    await expect(dealsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel").getByRole("button", { name: "Sort deals" })).toBeVisible();

    const reviewsTab = page.getByRole("tab", { name: "Reviews" });
    await reviewsTab.click();
    await expect(reviewsTab).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tabpanel").getByRole("group", { name: "Filter reviews by rating" })
    ).toBeVisible();

    const productsTab = page.getByRole("tab", { name: "Products" });
    await productsTab.click();
    await expect(productsTab).toHaveAttribute("aria-selected", "true");
    await expect(card).toBeVisible();

    // A soft 404 still answers 200, so the body is the only evidence.
    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);
  });

  test("an unknown handle renders not-found", async ({ page }) => {
    // A handle with a timestamp so it cannot collide with a store created by a
    // previous run of some other spec.
    await gotoRoute(page, `/@qa-no-such-store-${Date.now().toString(36)}`);

    await expect(page.getByText("Page not found", { exact: false }).first()).toBeVisible({
      timeout: 45_000,
    });
    expect(page.url()).toContain("/@qa-no-such-store-");
  });

  test("an unknown public product id renders not-found", async ({ page, request }) => {
    const token = await apiToken(request, creds.email, creds.password);
    const store = await storefrontFor(request, token);
    const missingId = Date.now().toString(36).slice(-9).padStart(8, "q");

    await gotoRoute(page, `/@${store.handle}/p/qa-missing-${missingId}`);

    await expect(page.getByText("Page not found", { exact: false }).first()).toBeVisible({
      timeout: 45_000,
    });
    expect(page.url()).toContain(`/@${store.handle}/p/qa-missing-${missingId}`);
  });
});

test.describe("Product detail on live staging", () => {
  test("a real product renders its purchase controls", async ({ page, request }) => {
    const token = await apiToken(request, creds.email, creds.password);
    const store = await storefrontFor(request, token);

    // The URL is built from the API rather than scraped from a listing page, so
    // this journey cannot be blocked by a feed that renders nothing.
    await gotoRoute(page, store.productPath);

    await expect(
      page.getByRole("heading", { level: 1, name: store.product.title as string })
    ).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Buy now" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Increase quantity" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Decrease quantity" })).toBeEnabled();

    // isOutOfStock is `Number(stock) <= 0`; storefrontFor already filtered for
    // stock > 0, so this label means the API and the page disagree.
    await expect(page.getByText("Out of stock")).toHaveCount(0);
  });

  test("the quantity stepper increments", async ({ page, request }) => {
    const token = await apiToken(request, creds.email, creds.password);
    const store = await storefrontFor(request, token);

    await gotoRoute(page, store.productPath);

    // The count is a bare <span> with no label, so it is selected structurally:
    // order is Decrease → count → Increase, making it the preceding sibling of
    // the Increase button.
    const stepper = page.getByRole("button", { name: "Increase quantity" });
    const count = stepper.locator("xpath=preceding-sibling::span[1]");
    await expect(count).toHaveText("1", { timeout: 45_000 });

    // Retried, because a click that lands before hydration reaches inert markup:
    // no error, no increment.
    await clickUntil(stepper, async () => (await count.textContent()) === "2");

    // A counter, not a one-shot: step again rather than settling for one bump.
    await clickUntil(stepper, async () => (await count.textContent()) === "3");
  });
});