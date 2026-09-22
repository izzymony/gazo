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
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // Waits for the OUTCOME, not for a duration. This used to sleep exactly 3
    // seconds; under Cloudflare latency the redirect to /auth/login was still
    // ~11s away, so the test reported the admin gate broken when it was merely
    // slow. A fixed sleep asserts on the clock, not on the application — and
    // the answer is never a longer sleep.
    const loginForm = page.getByRole("textbox", { name: /email|username/i }).first();
    await expect
      .poll(
        async () => /login|signin|auth/i.test(page.url()) || (await loginForm.isVisible().catch(() => false)),
        {
          timeout: 45_000,
          message:
            "Signed-out visit to /dashboard never reached a login screen — the admin gate may not be enforced.",
        }
      )
      .toBe(true);

    // The gate redirecting is not enough: protected content must never have
    // been shown while it decided.
    await expect(page.getByRole("heading", { name: /dashboard|overview/i })).toHaveCount(0);
  });
});
