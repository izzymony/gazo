import { test, expect } from "@playwright/test";
import { resolveTargets } from "../env.cjs";

const targets = resolveTargets();

/**
 * IMPORTANT: assert on CONTENT, never on response.ok().
 *
 * The deployed app answers HTTP 200 for every unknown path and renders a
 * client-side "Page not found" — and every page shares one <title>. A suite
 * built on status codes or titles would pass for routes that do not exist.
 * The "unknown route" test below is the control that keeps the rest honest.
 */
const NOT_FOUND = "Page not found";

const pages = [
  // Markers must not span an inline <br>: this H1 is "Turn your attention<br>
  // into income.", whose textContent reads "attentioninto" with no space, and
  // Playwright matches textContent. Keep each marker inside one text node.
  { path: "/", marker: "Turn your attention" },
  { path: "/welcome", marker: "I want to sell" },
  { path: "/signin", marker: "Login to my account" },
  { path: "/cart", marker: "Cart and orders" },
];

test.describe("Web smoke", () => {
  for (const { path, marker } of pages) {
    test(`${path} renders its own content`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
      // Proves the marker above is route-specific rather than chrome that the
      // 404 page also renders.
      await expect(page.getByText(NOT_FOUND, { exact: false })).toHaveCount(0);
    });
  }

  test("an unknown route renders not-found (control for the assertions above)", async ({ page }) => {
    const res = await page.goto("/this-route-does-not-exist-qa-control");
    // Documents the soft-404: the status is 200 and only the body tells the truth.
    expect(res?.status()).toBe(200);
    await expect(page.getByText(NOT_FOUND, { exact: false }).first()).toBeVisible();
  });

  /**
   * The regression that shipped a broken staging deploy: NEXT_PUBLIC_API_BASE_URL
   * is inlined at BUILD time, so when it is missing from the build environment
   * the bundle silently falls back to deriving a URL from window.location — which
   * on staging resolves to http://staging.vibaar.com:8088, wrong host, wrong port
   * and mixed-content blocked.
   *
   * Asserting the ABSENCE of localhost would not work: the localhost fallback is
   * a literal in the source and is always present. The real signal is that the
   * CONFIGURED api host is present.
   */
  test("the built bundle points at the configured API host", async ({ page, request }) => {
    const apiHost = new URL(targets.api).host;

    await page.goto("/");
    const scripts = await page.locator("script[src^='/_next/static']").evaluateAll(
      (els) => els.map((e) => (e as HTMLScriptElement).getAttribute("src")!)
    );
    expect(scripts.length).toBeGreaterThan(0);

    let found = false;
    for (const src of scripts) {
      const res = await request.get(`${targets.web}${src}`);
      if (!res.ok()) continue;
      if ((await res.text()).includes(apiHost)) {
        found = true;
        break;
      }
    }

    expect(
      found,
      `No bundle references ${apiHost}. NEXT_PUBLIC_API_BASE_URL was almost ` +
        `certainly missing from the BUILD environment — it is inlined at build ` +
        `time, so setting it as a runtime variable has no effect. Set it as a ` +
        `build variable and redeploy.`
    ).toBe(true);
  });
});
