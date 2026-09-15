import { test, expect } from "@playwright/test";
import { resolveTargets, resolveSellerCredentials } from "../env.cjs";
import { signIn } from "../login";

const targets = resolveTargets();
const creds = resolveSellerCredentials();

// Absent credentials means "not set up yet", not "broken" — skip rather than
// fail, so the smoke suite stays usable on an unseeded environment.
test.skip(
  !creds,
  "Set QA_SELLER_EMAIL and QA_SELLER_PASSWORD (see scripts/qa/seed-staging.mjs)"
);

test.describe("Seller core", () => {
  test("can sign in and reach the dashboard", async ({ page }) => {
    await signIn(page, creds!.email, creds!.password);
    await expect(page).toHaveURL(/dashboard|welcome/);
  });

  /**
   * The regression this whole QA effort started from: an edit announced
   * "Product updated successfully!" while the write had failed, so the only
   * assertion that means anything is what survives a RELOAD. Reading the value
   * back from the page you just submitted proves nothing.
   */
  test("a product edit survives a reload", async ({ page, request }) => {
    // `request` is already an APIRequestContext — newContext() lives on the
    // `playwright` fixture, not on this one.
    const auth = await request.post(`${targets.api}/login`, {
      data: { identifier: creds!.email, email: creds!.email, password: creds!.password },
    });
    const token = (await auth.json())?.data?.access_token;
    expect(token, "could not log in via the API to find a product").toBeTruthy();

    const list = await request.get(`${targets.api}/products?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const products = (await list.json())?.data?.data ?? [];
    const target = products.find((p: any) => /^QA Test/.test(p?.title ?? ""));
    test.skip(!target, "No QA seed product found — run scripts/qa/seed-staging.mjs first");

    const nextTitle = `QA Test Tee ${Date.now()}`;
    const titleSelector = "input[name='title'], input[name='name']";

    await signIn(page, creds!.email, creds!.password);
    await page.goto(`/dashboard/catalog/product/create/manual/edit/${target.id}`);

    const titleField = page.locator(titleSelector).first();
    await expect(titleField).toBeVisible({ timeout: 30_000 });
    await titleField.fill(nextTitle);

    await page.getByRole("button", { name: /save|update|publish/i }).first().click();

    // Re-read from the SERVER, not from the form still on screen: the bug this
    // guards against showed a success toast over a write that never landed.
    await page.waitForTimeout(2000);
    await page.reload();
    await expect(page.locator(titleSelector).first()).toHaveValue(nextTitle, {
      timeout: 30_000,
    });
  });
});
