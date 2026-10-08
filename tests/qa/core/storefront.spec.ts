import { test, expect } from "@playwright/test";
import { resolveTargets, requireSellerCredentials } from "../env.cjs";
import { signIn, gotoRoute } from "../login";
import { requireOptIn } from "./helpers/staging";

const targets = resolveTargets();
const creds = requireSellerCredentials();

async function sellerToken(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post(`${targets.api}/login`, {
    data: {
      identifier: creds.email,
      email: creds.email,
      password: creds.password,
    },
  });

  const token = (await res.json())?.data?.access_token;
  expect(token, "Could not sign in to the staging API to inspect the seller state.").toBeTruthy();
  return String(token);
}

async function sellerBusiness(request: import("@playwright/test").APIRequestContext) {
  const token = await sellerToken(request);
  const me = await request.get(`${targets.api}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await me.json();
  const business = payload?.data?.business ?? payload?.data?.data?.business ?? null;
  return { token, business };
}

test.describe("Seller storefront core", () => {
  test("can create a store on staging when the seller does not already own one", async ({ page, request }) => {
    const { business } = await sellerBusiness(request);
    if (business) {
      test.skip(
        true,
        "Seller already has a business on this staging account; create-store flow is not applicable."
      );
    }
    requireOptIn(
      "QA_ALLOW_STORE_CREATION",
      "a permanent store (the API does not expose a store-delete endpoint)"
    );

    const storeName = `QA Store ${Date.now().toString().slice(-6)}`;
    const storeHandle = `qa${Date.now().toString().slice(-6)}`;

    await signIn(page, creds.email, creds.password);
    await gotoRoute(page, "/dashboard/storefront/create");

    await page.locator("input[name='name']").fill(storeName);
    await page.locator("input[name='tag']").fill(storeHandle);

    const categoryField = page.locator("div.cursor-pointer").filter({ hasText: "Store category" });
    await expect(categoryField).toBeVisible({ timeout: 30_000 });
    await categoryField.click();

    const category = page.getByText("Fashion Store");
    await expect(category).toBeVisible({ timeout: 30_000 });
    await category.click();

    const confirmCategory = page.getByRole("button", { name: /done|confirm|select/i });
    if (await confirmCategory.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmCategory.click();
    }

    await page.getByRole("button", { name: /continue/i }).click();

    await page.locator("input[name='state']").fill("Lagos");
    await page.getByRole("button", { name: /finish setup|create store/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  });

  test("can update store details on staging without mock interception", async ({ page, request }) => {
    const { business } = await sellerBusiness(request);
    expect(business, "No business exists on this staging seller account — create one first or seed the environment.").toBeTruthy();

    const updateName = `QA Store Update ${Date.now().toString().slice(-6)}`;
    const updateEmail = `qa+${Date.now()}@example.com`;
    const updatePhone = "08087654321";

    await signIn(page, creds.email, creds.password);
    await gotoRoute(page, "/dashboard/storefront/details");

    const nameInput = page.getByLabel("Store name");
    await expect(nameInput).toBeVisible({ timeout: 30_000 });

    const originalName = await nameInput.inputValue();
    const originalEmail = await page.getByLabel("Store email").inputValue();
    const originalPhone = await page.getByLabel("Store phone number").inputValue();

    await nameInput.fill(updateName);
    await page.getByLabel("Store email").fill(updateEmail);
    await page.getByLabel("Store phone number").fill(updatePhone);

    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(nameInput).toHaveValue(updateName, { timeout: 30_000 });

    try {
      await nameInput.fill(originalName);
      await page.getByLabel("Store email").fill(originalEmail);
      await page.getByLabel("Store phone number").fill(originalPhone);
      await page.getByRole("button", { name: /^save$/i }).click();
      await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 30_000 });
    } catch (error) {
      // Keep the staging data stable for the next run. The real QA environment is a
      // shared resource, so a cleanup failure should not be silently ignored.
      throw new Error(`Store cleanup failed after staging edit. Restore the store manually before the next QA run. ${String(error)}`);
    }
  });
});
