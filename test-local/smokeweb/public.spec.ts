import { test, expect } from "@playwright/test";

import { gotoRoute } from "./helpers/nav";

/**
 * Public routes — no auth, no API.
 *
 * IMPORTANT: assert on CONTENT, never on `response.ok()`. This app has a real
 * `app/not-found.tsx`, but Next still answers an unknown path with HTTP 200 and
 * renders it client-side, so a status-code assertion would pass for a route that
 * does not exist. The control test at the bottom of this file is what keeps the
 * rest honest.
 */

/**
 * Markers must not span an inline element break. The homepage hero is
 * "Turn your" / "attention" / "into income." across three nodes
 * (`features/marketing-v2/content.ts:13-15`), so `textContent` reads
 * "Turn yourattentioninto income." with no spaces. Playwright matches
 * textContent, so a marker built from the whole sentence would never match.
 */
const pages = [
  { path: "/", marker: "Turn your" },
  { path: "/about", marker: "About Vibaar" },
  { path: "/careers", marker: "Careers" },
  { path: "/privacy", marker: "Privacy policy" },
  { path: "/terms", marker: "Terms of Service" },
];

test.describe("Public pages", () => {
  for (const { path, marker } of pages) {
    test(`${path} renders its own content`, async ({ page }) => {
      await gotoRoute(page, path);

      // filter({ visible: true }) matters: the shell renders both a desktop and
      // a mobile nav, so at a phone viewport the first DOM match can be the
      // hidden desktop one.
      await expect(
        page.getByText(marker, { exact: false }).filter({ visible: true }).first()
      ).toBeVisible();

      // Proves the marker is route-specific rather than chrome the 404 also has.
      await expect(page.getByText("Page not found", { exact: false })).toHaveCount(0);
    });
  }

  /**
   * The control. Without it, every assertion above is unfalsifiable: if a route
   * silently rendered the 404 page, a marker that happened to live in the shared
   * chrome would still match.
   */
  test("an unknown route renders not-found", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-smokeweb", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(200);
    await expect(page.getByText("Page not found", { exact: false }).first()).toBeVisible();
  });
});