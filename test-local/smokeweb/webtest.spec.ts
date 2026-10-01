import { test, expect } from "@playwright/test";

import { clickUntil, gotoRoute, submitOnce, waitForHydration } from "./helpers/nav";

/**
 * Auth and entry-point journeys.
 *
 * These were written against the staging harness and never ran locally: three
 * of them sat inside a block comment (see the `?step` notes below), and the
 * routes and field names they used had all drifted. The corrections are not
 * cosmetic — each one below was a test that could not have passed:
 *
 *   - there is no `/login` route. It is `/signin`, and the form lives at
 *     `/signin?step=1`; step 0 is the "pick an option" landing.
 *   - signin's fields are `identifier` + `password`, NOT `emailPhone` +
 *     `passwords` (those are signup's names).
 *   - there is no `/reset-password` route. Forgot-password walks
 *     `?step=1` -> `?step=2` -> `?step=3` -> `signin?step=1`, and its field is
 *     `email`, not `emailPhone`.
 *   - `/forgot-password` without `?step` renders a header and a live CTA over
 *     an empty column (the component documents this as a known routing bug), so
 *     the `?step=1` is required for there to be a form to drive.
 *   - `data-testid="product-card"` does not exist anywhere in production code.
 *
 * Every endpoint is mocked, so these assert the client's own wiring — which
 * fields feed which request, and where each success callback navigates.
 */

/**
 * Generous ceiling for the navigation that ends a flow.
 *
 * These journeys end in `router.push`, and the destination is compiled by
 * `next dev` on first visit. The 20s these used to allow expired while
 * `/welcome` was still compiling, so the signup test failed on a cold dev
 * server and passed on a warm one — a flaky test that looked like a product
 * bug. 60s matches the measured cold-compile ceiling already documented in
 * playwright.config.ts.
 */
const FINAL_NAV_TIMEOUT = 60_000;

test("Basic web test", async ({ page }) => {
  await gotoRoute(page, "/");
  await expect(page).toHaveTitle(/Vibaar/i);
});

test.describe("Auth", () => {
  /**
   * Shared auth mocks.
   *
   * `route.fulfill` bypasses the real backend, so these journeys prove the
   * client sends the right field names to the right paths — which is the part
   * that silently rots. Each handler mirrors the envelope the store destructures
   * (authStore.ts:195 reads `response.data.data`, getMe at :740 reads
   * `response.data.data.user`).
   */
  async function mockAuthApi(page: import("@playwright/test").Page, email: string) {
    const tokens = {
      data: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        data: { id: "u-1", email, phone: "+2348012345678" },
      },
    };
    const me = {
      data: { user: { id: "u-1", email, phone: "+2348012345678" }, business: null },
    };

    await page.route("**/api/v1/validate-email-or-phone", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { exists: false, type: "email" } }),
      })
    );
    await page.route("**/api/v1/register", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokens) })
    );
    await page.route("**/api/v1/login", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tokens) })
    );
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(me) })
    );
    await page.route("**/api/v1/send-otp", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { data: {} } }),
      })
    );
    await page.route("**/api/v1/verification-code/validate-code", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { data: {} } }),
      })
    );
    await page.route("**/api/v1/forgot-password", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { data: {} } }),
      })
    );
  }

  test("Complete full user signup flow", async ({ page }) => {
    const stamp = Date.now();
    const email = `testuser_${stamp}@example.com`;
    const password = "Password123!";

    await mockAuthApi(page, email);

    const cont = page.getByRole("button", { name: /continue/i });

    // Step 1 — contact info. The step only advances once the validation
    // response comes back, so observing that request IS the assertion that the
    // typed identifier reached the right endpoint.
    await gotoRoute(page, "/signup?step=1", page.locator("input[name='emailPhone']"));
    // The form renders before React attaches its handlers, and typing into that
    // window leaves formik's state empty — the submit then fails validation with
    // "Email is required" against a field that visibly holds an address.
    await waitForHydration(page);
    await page.locator("input[name='emailPhone']").fill(email);
    await submitOnce(page, cont, { request: "validate-email-or-phone", url: /step=2/ });

    // Step 2 — password.
    await expect(page.locator("input[name='passwords']")).toBeVisible({ timeout: 30_000 });
    await page.locator("input[name='passwords']").fill(password);
    await page.locator("input[name='confirmPassword']").fill(password);
    // A local step push with no request behind it, so the URL is the only
    // signal — hence the longer retry budget rather than a short one.
    await clickUntil(cont, async () => /step=3/.test(page.url()), {
      attempts: 15,
      intervalMs: 1_000,
    });

    // Step 3 — profile. Reaching these fields proves OTP is disabled in this
    // environment; with OTP on, step 3 is the code screen instead
    // (SignUpOverview.tsx:366).
    await expect(page.locator("input[name='fullName']")).toBeVisible({ timeout: 30_000 });
    await page.locator("input[name='fullName']").fill("Test QualityUser");
    await page.locator("input[name='user_name']").fill(`testuser${stamp.toString().slice(-6)}`);
    await page.locator("input[name='phoneNumber']").fill("08012345678");

    // Register succeeds, sets the auth cookie, and redirects to /welcome.
    await submitOnce(page, cont, { request: "/api/v1/register", url: /\/welcome/ });

    // The cookie is the actual proof of authentication — the redirect alone
    // would also pass if the app navigated before persisting the session.
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "accessToken")?.value).toBe("mock-access-token");
  });

  test("signs in an existing account", async ({ page }) => {
    const email = "existing@example.com";

    await mockAuthApi(page, email);

    // `?step=1` is the form; without it step 0 shows the option picker.
    await gotoRoute(page, "/signin?step=1", page.locator("input[name='identifier']"));
    await waitForHydration(page);

    await page.locator("input[name='identifier']").fill(email);
    await page.locator("input[name='password']").fill("Password123!");
    await submitOnce(page, page.getByRole("button", { name: "Sign in" }), {
      request: "/api/v1/login",
      url: /\/welcome/,
    });
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "accessToken")?.value).toBe("mock-access-token");
  });

  test("completes the forgot password flow", async ({ page }) => {
    const email = "forgot@example.com";

    await mockAuthApi(page, email);

    // Step 1 — request a reset code. `?step` is required; the bare route has no
    // form to drive.
    await gotoRoute(page, "/forgot-password?step=1", page.locator("input[name='email']"));
    await waitForHydration(page);
    await page.locator("input[name='email']").fill(email);
    const cont = page.getByRole("button", { name: /^continue$/i });

    // The sendOtp success callback is what advances the step, so the request
    // and the new URL together prove it was wired and accepted.
    await submitOnce(page, cont, { request: "/api/v1/send-otp", url: /step=2/ });

    // Step 2 — the code. Six single-character boxes with no name or label, so
    // they are selected by their numeric input mode and filled positionally.
    const boxes = page.locator("input[inputmode='numeric']");
    await expect(boxes).toHaveCount(6, { timeout: 30_000 });
    for (const [i, digit] of [..."123456"].entries()) {
      await boxes.nth(i).fill(digit);
    }

    // Completing the boxes does NOT advance on its own — the parent gates the
    // step on `otp.length === 6` behind this button (ForgotPassword.tsx:100).
    await clickUntil(cont, async () => /step=3/.test(page.url()), {
      attempts: 15,
      intervalMs: 1_000,
    });

    // Step 3 — choose the new password, which hands off to signin.
    await page.locator("input[name='password']").fill("NewPassword123!");
    await page.locator("input[name='confirmPassword']").fill("NewPassword123!");
    await submitOnce(page, page.getByRole("button", { name: /reset password/i }), {
      request: "/api/v1/forgot-password",
      url: /\/signin\?step=1/,
    });
  });
});

test.describe("Product browsing", () => {
  test("the homepage links into the marketplace", async ({ page }) => {
    await gotoRoute(page, "/");

    // The old version of this test looked for `div[data-testid='product-card']`
    // on the homepage. No such attribute exists, and the homepage is the seller
    // marketing site, not a catalog. So this asserts the real entry point: a
    // shopper can get from the landing page into the marketplace. The link's
    // accessible name is the marketing copy, not "Shop" (content.ts:18).
    const shopLink = page.getByRole("link", { name: "Explore stores" }).first();
    await expect(shopLink).toBeVisible();
    await shopLink.click();

    await expect(page).toHaveURL(/\/shop/, { timeout: FINAL_NAV_TIMEOUT });
    // The marketplace's own search affordance renders once the client mounts.
    await expect(page.getByPlaceholder("Enter a vendor name")).toBeVisible({ timeout: 30_000 });
  });
});
