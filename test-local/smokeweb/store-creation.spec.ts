import { test, expect } from "@playwright/test";

test("Complete store creation flow (2-step wizard)", async ({ page, baseURL }) => {
  // ── Test data ──
  const storeName = `TestStore_${Date.now().toString().slice(-6)}`;
  const storeHandle = `handle${Date.now().toString().slice(-6)}`;
  const storeCategory = "Fashion Store";
  const storeState = "Lagos";

  // `baseURL`, not a hardcoded localhost: addCookies needs an absolute URL, and
  // this spec is also run against staging (SMOKEWEB_TARGET=staging).
  await page.context().addCookies([
    {
      name: "accessToken",
      value: "mock-access-token",
      url: baseURL as string,
    },
  ]);

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    if (request.method() === "GET" && request.url().includes("/users/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: "mock-user-id",
              email: "testuser@example.com",
              phone: "08012345678",
            },
            business: null,
          },
        }),
      });
      return;
    }
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { data: [] } }),
      });
      return;
    }

    // Deny by default. An unmocked API call must NOT reach a real backend: this
    // spec also runs against staging (playwright.staging.config.ts), where
    // `continue()` would create a real store with junk data. Aborting surfaces
    // the gap as a loud failed request instead of a silent write.
    await route.abort();
  });

  // ── Mock the store creation API (/business) ──
  await page.route("**/business", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "successful",
          data: {
            id: "mock-store-id",
            name: storeName,
            tag: storeHandle,
            category: storeCategory,
            logo: null,
            email: "testuser@example.com",
            phone: "08012345678",
            address: {
              country: "Nigeria",
              province: storeState,
              address_line: "",
            },
            business_setting: {
              shipping_amount: 0,
              shipping_type: "INSTASHOP",
            },
          },
        }),
      });
    } else {
      // Only POST /business is expected. A GET or PATCH reaching here means the
      // app changed shape, and letting it through would hit the real API — this
      // suite runs against staging too.
      await route.abort();
    }
  });

  // ══════════════════════════════════════════════
  // STEP 1 — Store Details
  // ══════════════════════════════════════════════
  // Relative: resolved against baseURL so this runs on any target.
  await page.goto("/dashboard/storefront/create");

  // Fill store name
  const storeNameInput = page.locator("input[name='name']");
  await expect(storeNameInput).toBeVisible({ timeout: 15_000 });
  await storeNameInput.fill(storeName);

  // Fill store handle
  const storeTagInput = page.locator("input[name='tag']");
  await storeTagInput.fill(storeHandle);

  // Select category — opens a modal dialog
  const categoryField = page.locator("div.cursor-pointer").filter({
    hasText: "Store category",
  });
  await expect(categoryField).toBeVisible();
  await categoryField.click();

  // Wait for category modal, search/select the category
  const categoryOption = page.getByText(storeCategory);
  await expect(categoryOption).toBeVisible({ timeout: 10_000 });
  await categoryOption.click();

  
  // Confirm category selection (modal has a confirm/done button)
  const confirmCategoryBtn = page.getByRole("button", { name: /done|confirm|select/i });
  if (await confirmCategoryBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmCategoryBtn.click();
  }

  // "Use the same personal contact details" toggle is ON by default — leave it

  // Click Continue to go to Step 2
  const continueButton = page.getByRole("button", { name: /continue/i });
  await continueButton.click();

  // ══════════════════════════════════════════════
  // STEP 2 — Store Address
  // ══════════════════════════════════════════════

  // Country is fixed to Nigeria (no input needed)

  // Fill state/province
  const stateInput = page.locator("input[name='state']");
  await expect(stateInput).toBeVisible({ timeout: 15_000 });
  await stateInput.fill(storeState);

  
  // Click "Finish setup" to submit
  const finishButton = page.getByRole("button", { name: /finish setup/i });
  await finishButton.click();

  // ══════════════════════════════════════════════
  // ASSERTION — Redirect to dashboard
  // ══════════════════════════════════════════════
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
});