import { test, expect } from "@playwright/test";
import { resolveTargets } from "../env.cjs";

const targets = resolveTargets();

test.describe("Admin smoke", () => {
  test.use({ baseURL: targets.admin });

  test("admin root reaches the dashboard route", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("an unauthenticated visit to the dashboard does not expose it", async ({ page }) => {
    await page.goto("/dashboard");
    // Not networkidle — a dev server's HMR websocket never lets it settle. The
    // gate is client-side, so give hydration a moment and then read the page.
    await page.waitForTimeout(3000);

    // The gate is client-side, so this asserts on what a signed-out person can
    // actually SEE — either bounced to a login screen, or shown a login form.
    const url = page.url();
    const loginVisible = await page
      .getByRole("textbox", { name: /email|username/i })
      .first()
      .isVisible()
      .catch(() => false);

    expect(
      /login|signin|auth/i.test(url) || loginVisible,
      `Signed-out visit to /dashboard stayed at ${url} with no login form — the admin gate may not be enforced.`
    ).toBe(true);
  });
});
