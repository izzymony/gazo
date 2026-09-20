import { test, expect } from "@playwright/test";
import { resolveTargets } from "../env.cjs";

const targets = resolveTargets();

/**
 * The product taxonomy, asserted as a whole.
 *
 * It ships via migration 014 (`014_seed_product_taxonomy.sql`), applied by the
 * B9 versioned runner on boot — NOT by a manual seed. An environment whose
 * taxonomy is empty or partial has a migration problem, and the way that shows
 * up otherwise is oblique: product creation fails with "something went wrong",
 * because category_id and sub_category_id are required and there is nothing to
 * choose. This says so directly.
 *
 * API-only, so it lives in smoke and needs no credentials.
 */
test.describe("Taxonomy", () => {
  test("is fully seeded and linked to the shipping provider", async ({ request }) => {
    const res = await request.get(`${targets.api}/categories/get-all-categories`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const categories = body?.data?.data ?? body?.data ?? [];
    const subs = categories.flatMap((c: any) => c?.sub_categories ?? []);

    expect(categories.length, "category count").toBe(13);
    expect(subs.length, "subcategory count").toBe(52);

    // Without external_category_id the Shipbubble lookup misses and rates
    // cannot be fetched — the linkage is the point, not the row count.
    const linked = categories.filter((c: any) => c?.external_category_id);
    expect(linked.length, "categories linked to an external (Shipbubble) category").toBe(13);

    // Shipping defaults stand in when a seller leaves dimensions blank; a
    // subcategory without them silently produces an unshippable product.
    const withDefaults = subs.filter(
      (s: any) => s?.default_weight || s?.default_length || s?.default_width || s?.default_height
    );
    expect(withDefaults.length, "subcategories carrying shipping defaults").toBe(52);
  });
});
