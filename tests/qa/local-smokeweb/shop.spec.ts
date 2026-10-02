import { test, expect } from "@playwright/test";

import { gotoRoute } from "./helpers/nav";
import { PRODUCT, SHOP_VENDOR, VENDOR } from "./helpers/fixtures";

/**
 * Marketplace discovery — `/shop`.
 *
 * `/shop` is `"use client"` (app/(buyer)/shop/page.tsx:5) and fetches
 * `GET /shop/vendors` through the browser, so `page.route` CAN cover it. The
 * storefront and product pages that follow cannot; see helpers/stubApi.ts.
 *
 * Selectors: VendorCard renders `section[aria-label={name}]`
 * (features/storefront/VendorCard.tsx:118) and the grid maps `average_rating` →
 * `rating`, `followers_count` → `followers` (shop/page.tsx:484-485). There is no
 * `data-testid` anywhere in production code.
 */

/**
 * Every query the browser asked for, in arrival order.
 *
 * A single "last query" slot is racy here: the mount effect fires with no
 * `search`, and React StrictMode's double-invoke plus the infinite-scroll
 * sentinel mean a search-less request can land AFTER the debounced search one
 * and silently overwrite it. Assertions then fail on ordering rather than on
 * behaviour. Collecting all of them makes "a request carried this term" the
 * thing under test, with no ordering assumption.
 */
let shopQueries: URLSearchParams[] = [];

test.beforeEach(async ({ page }) => {
  shopQueries = [];

  await page.route("**/api/v1/shop/vendors**", async (route) => {
    const url = new URL(route.request().url());
    shopQueries.push(url.searchParams);

    const search = url.searchParams.get("search") ?? "";
    const category = url.searchParams.get("category") ?? "";
    const vendors =
      search || (category && category !== SHOP_VENDOR.category) ? [] : [SHOP_VENDOR];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: { message: "successful", data: vendors },
        page: 1,
        total: vendors.length,
        totalPages: 1,
      }),
    });
  });

  // `stores` — a different dataset from the feed — backs the SearchInput
  // DROPDOWN (SearchInput.tsx:38), which filters it client-side. Serve it
  // explicitly so the dropdown is deterministic regardless of whether a backend
  // happens to be running, and so it can't be mistaken for the feed.
  await page.route("**/api/v1/businesses**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { message: "successful", data: [VENDOR] } }),
    })
  );

  // TanStack Query caches categories for 30 min; an unhandled GET would fall
  // through to the stub, which answers it — but only if the route does not
  // 404, so be explicit rather than depending on the stub's catch-all.
  await page.route("**/api/v1/categories/get-all-categories", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { message: "successful", data: [] } }),
    })
  );
});

test.describe("Shop discovery", () => {
  test("lists vendors from the marketplace feed", async ({ page }) => {
    await gotoRoute(page, "/shop");

    // The card is a <section aria-label={name}>, NOT a link or a button — it
    // contains Follow plus one control per product.
    const card = page.getByRole("region", { name: VENDOR.name });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: VENDOR.name })).toHaveAttribute(
      "href",
      `/@${VENDOR.tag}`
    );

    // Rating/followers render only when non-zero (VendorCard.tsx:113-114), so
    // their presence proves the mapping from average_rating/followers_count.
    await expect(card.getByText("4.6")).toBeVisible();
    await expect(card.getByText("128")).toBeVisible();

    // The preview rail links to the product. `public_id` must be present or
    // productPath emits `/@handle/p/slug-`, which looks valid and 404s
    // (lib/urlHelpers.ts:67).
    await expect(card.getByRole("link", { name: PRODUCT.title })).toHaveAttribute(
      "href",
      `/@${VENDOR.tag}/p/${PRODUCT.slug}-${PRODUCT.public_id}`
    );

    // The feed is paged at a fixed size; pin it so a silent change to the page
    // size shows up here instead of as a quietly truncated grid.
    expect(shopQueries.some((q) => q.get("limit") === "12")).toBe(true);
  });

  test("a search with no matches reaches the empty state", async ({ page }) => {
    await gotoRoute(page, "/shop");

    // Wait for React to actually own the page before typing.
    //
    // `gotoRoute` returns at `domcontentloaded`, but Next serves markup before
    // hydration attaches handlers. Filling an input that has no listener yet
    // sets the DOM value and dispatches an event nobody handles, so `searchTerm`
    // stays "" and the feed never refetches — the run then hangs on the empty
    // state until the assertion times out.
    //
    // The rendered vendor card is the proof hydration finished: it comes from
    // Zustand state, so it can only paint once the component is live.
    await expect(page.getByRole("region", { name: VENDOR.name })).toBeVisible();

    const search = page.getByPlaceholder("Enter a vendor name");
    await expect(search).toBeVisible();
    await search.fill("zzzz-no-such-vendor");

    // "No vendors found" exists in TWO places, and only one of them is the feed:
    // SearchInput.tsx:193 renders it in the dropdown (client-filtered over
    // `stores`, no request involved) and shop/page.tsx:539 renders it for the
    // feed. Asserting the bare string matched the dropdown, so this passed
    // without the feed ever refetching.
    //
    // The feed's EmptyState subtitle is the unique discriminator, so target that.
    await expect(page.getByText("Try a different search or category")).toBeVisible();

    // The typed term must have reached the server as `search`, not just
    // filtered the DOM locally — otherwise the empty state would also appear
    // against a live API while the server kept returning every vendor.
    expect(shopQueries.some((q) => q.get("search") === "zzzz-no-such-vendor")).toBe(true);

    // The vendor card must be GONE, not merely the empty message added.
    await expect(page.getByRole("region", { name: VENDOR.name })).toHaveCount(0);
  });
});