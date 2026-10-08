import { test, expect } from "@playwright/test";
import { resolveTargets, requireSellerCredentials } from "../env.cjs";
import { signIn, clickUntil, gotoRoute, waitForHydration } from "../login";

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

async function addSeededProductToCart(page: import("@playwright/test").Page, path: string) {
  await gotoRoute(page, path);
  await page.evaluate(() => localStorage.removeItem("order-store"));
  await page.reload();

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
}

test.describe("Buyer core", () => {
  test("a product page opens and renders the product", async ({ page, request }) => {
    const path = await seededProductPath(request);
    expect(path, "No product with a public id on this environment — run `pnpm qa:seed` first.").toBeTruthy();

    await gotoRoute(page, path!);
    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /add to (cart|bag)/i }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("an empty cart shows its empty state", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("order-store");
    });
    await gotoRoute(page, "/cart");

    await expect(page.getByText(/your cart is empty/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /proceed to checkout/i })).toHaveCount(0);
  });

  test("a product can be added to the cart", async ({ page, request }) => {
    // The cart is tied to an account: as a guest the add silently does nothing,
    // so this signs in first rather than asserting on a no-op.
    const creds = requireSellerCredentials();

    const path = await seededProductPath(request);
    expect(path, "No product with a public id on this environment — run `pnpm qa:seed` first.").toBeTruthy();

    await signIn(page, creds.email, creds.password);
    await addSeededProductToCart(page, path!);

    await gotoRoute(page, "/cart");
    await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);

    // The cart's own empty-state copy is the assertion: if it remains after the
    // add, nothing was added.
    try {
      await expect(
        page.getByText(/your cart is empty/i),
        "Cart still shows its empty state after Add to cart — the item never landed."
      ).toHaveCount(0, { timeout: 15_000 });

      await expect(page.getByRole("button", { name: /proceed to checkout/i })).toBeVisible();
      await expect(page.getByRole("button", { name: "Increase quantity" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Decrease quantity" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Remove item" })).toHaveCount(0);

      const increase = page.getByRole("button", { name: "Increase quantity" });
      const decrease = page.getByRole("button", { name: "Decrease quantity" });
      const quantity = increase.locator("xpath=preceding-sibling::span[1]");
      const totalAmount = page.getByText(/Total \(1\):/).locator("xpath=following-sibling::p[1]");
      await expect(quantity).toHaveText("1");
      await expect(totalAmount).toBeVisible();
      const oneItemTotal = await totalAmount.textContent();

      await clickUntil(increase, async () => (await quantity.textContent()) === "2");
      await expect(totalAmount).not.toHaveText(oneItemTotal ?? "");
      await clickUntil(decrease, async () => (await quantity.textContent()) === "1");
      await expect(totalAmount).toHaveText(oneItemTotal ?? "");

      // Decrementing the final unit changes the row to its explicit remove
      // state; it does not delete the item until Remove is clicked.
      await clickUntil(decrease, async () => (await quantity.textContent()) === "0");
      const remove = page.getByRole("button", { name: "Remove item" });
      await expect(remove).toBeVisible();
      await remove.click();
      await expect(page.getByText(/your cart is empty/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /proceed to checkout/i })).toHaveCount(0);
    } finally {
      // Defensive only. The cart is client-side: no backend cart routes exist and
      // orderStore never calls one, so this leaves NOTHING on staging and the
      // browser context is discarded anyway. Kept so the test stays correct if the
      // cart ever becomes server-backed, which is exactly when forgetting would cost.
      await page.evaluate(() => {
        try { localStorage.removeItem("order-store"); } catch { /* private mode */ }
      });
    }
  });

  test("proceed to checkout opens the shipping or order-review step without placing an order", async ({
    page,
    request,
  }) => {
    const creds = requireSellerCredentials();
    const path = await seededProductPath(request);
    expect(path, "No product with a public id on this environment — run `pnpm qa:seed` first.").toBeTruthy();

    await signIn(page, creds.email, creds.password);
    await addSeededProductToCart(page, path!);

    try {
      await gotoRoute(page, "/cart");
      await expect(page.getByRole("button", { name: /proceed to checkout/i })).toBeVisible();
      await page.getByRole("button", { name: /proceed to checkout/i }).click();

      await expect(page).toHaveURL(
        /\/cart\/(?:complete-order\/review|shipping-profile\/new)/,
        { timeout: 45_000 }
      );

      if (page.url().includes("/complete-order/review")) {
        await expect(page.getByRole("heading", { name: "Complete order" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Pay Now" })).toBeVisible();
        // Deliberately stop before Pay Now: no order or payment is created.
      } else {
        await expect(page.getByText("Add shipping profile", { exact: true }).first()).toBeVisible();
        // Do not submit a new address to the shared staging account.
      }
    } finally {
      await page.evaluate(() => localStorage.removeItem("order-store"));
    }
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
    await gotoRoute(page, "/shop");
    await page.locator("a[href*='/p/']").first().waitFor({ timeout: 45_000 }).catch(() => {});

    const hrefs = await page
      .locator("a[href*='/p/']")
      .evaluateAll((els) => els.map((e) => e.getAttribute("href") || ""));
    expect(
      hrefs.length,
      "No product links on /shop — run `pnpm qa:seed` first."
    ).toBeGreaterThan(0);

    const malformed = hrefs.filter((h) => /-$/.test(h));
    expect(
      malformed,
      `These /shop links have an empty public id and will 404. ` +
        `lib/urlHelpers.ts falls back to '' when product.public_id is missing, ` +
        `so the listing endpoint behind /shop is not returning it.`
    ).toEqual([]);
  });

  test("searching /shop for an unknown vendor reaches the empty state", async ({ page }) => {
    test.setTimeout(90_000);

    await gotoRoute(page, "/shop");
    const search = page.getByPlaceholder("Enter a vendor name");
    await expect(search).toBeVisible({ timeout: 30_000 });
    const feedError = page.getByText("Couldn't load vendors", { exact: true });
    if (await feedError.isVisible().catch(() => false)) {
      throw new Error("The staging vendor feed failed; the no-match search is not verifiable.");
    }

    // Do not type into the server-rendered form until React has attached its
    // handlers; otherwise the input can look filled without triggering search.
    await waitForHydration(page, search);

    const query = `qa-no-such-vendor-${Date.now().toString(36)}`;
    const searchResponse = page
      .waitForResponse(
        (response) => {
          const url = new URL(response.url());
          return (
            url.pathname.endsWith("/shop/vendors") &&
            url.searchParams.get("search") === query
          );
        },
        { timeout: 30_000 }
      )
      .then((response) => ({ kind: "response" as const, response }));
    const feedFailure = feedError
      .waitFor({ state: "visible", timeout: 35_000 })
      .then(
        () => ({ kind: "feed-error" as const }),
        () => ({ kind: "feed-not-reported" as const })
      );
    await search.fill(query);
    const outcome = await Promise.race([
      searchResponse.catch((error: Error) => ({
        kind: "request-timeout" as const,
        error,
      })),
      feedFailure,
    ]);
    if (outcome.kind === "feed-error") {
      throw new Error("The staging vendor feed failed; the no-match search is not verifiable.");
    }
    if (outcome.kind === "request-timeout") {
      throw new Error(
        `No response arrived from the staging vendor search endpoint. ${outcome.error.message}`
      );
    }
    if (outcome.kind === "feed-not-reported") {
      throw new Error("The staging vendor feed did not return a no-match result.");
    }
    const response = outcome.response;
    expect(response.ok(), `Marketplace search failed with HTTP ${response.status()}`).toBe(true);

    // This subtitle belongs to the feed empty state (not the search dropdown),
    // proving that the live marketplace query returned no matching vendors.
    await expect(page.getByText("Try a different search or category")).toBeVisible({
      timeout: 30_000,
    });
  });
});
