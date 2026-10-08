import { expect, test } from "@playwright/test";
import { signIn, gotoRoute } from "../login";
import { apiJson, apiToken, requireOptIn, runId, storefrontFor } from "./helpers/staging";
import { requireSellerCredentials } from "../env.cjs";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  expect(value, `${name} must be set for this explicitly opted-in staging journey.`).toBeTruthy();
  return value!;
}

test.describe("Staging account and shipping journeys", () => {
  test("signup creates an account through the current UI flow", async ({
    page,
    request,
  }) => {
    requireOptIn("QA_ALLOW_SIGNUP", "a permanent user account");
    const email = requiredEnv("QA_SIGNUP_EMAIL");
    const phone = requiredEnv("QA_SIGNUP_PHONE");
    const password = requiredEnv("QA_SIGNUP_PASSWORD");
    const fullName = requiredEnv("QA_SIGNUP_FULL_NAME");
    const username = requiredEnv("QA_SIGNUP_USERNAME");

    await page.goto("/signup?step=1");
    await page.getByPlaceholder("Enter phone number or email").fill(email);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/signup\?step=2$/);
    await expect(page.getByText("Create a Strong Password")).toBeVisible();

    await page.locator('input[name="passwords"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/signup\?step=3$/);

    await page.locator('input[name="fullName"]').fill(fullName);
    await page.locator('input[name="user_name"]').fill(username);
    await page.locator('input[name="phoneNumber"]').fill(phone);
    await expect(page.locator('input[name="email"]')).toHaveValue(email);

    const [signupResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().endsWith("/register") && response.request().method() === "POST"
      ),
      page.getByRole("button", { name: "Continue" }).click(),
    ]);
    expect(signupResponse.ok(), `Registration failed: ${await signupResponse.text()}`).toBeTruthy();
    await expect(page).toHaveURL(/\/welcome\?type=manual$/);
    await expect(
      await apiToken(request, email, password),
      "The new staging account should accept its signup password."
    ).toBeTruthy();
  });

  test("a buyer can create a shipping profile, get delivery options, and select one", async ({
    page,
    request,
  }) => {
    requireOptIn("QA_ALLOW_SHIPPING_PROFILE", "a temporary shipping profile and live delivery quote");
    const creds = requireSellerCredentials();
    const fullName = requiredEnv("QA_SHIPPING_FULL_NAME");
    const phone = requiredEnv("QA_SHIPPING_PHONE");
    const email = requiredEnv("QA_SHIPPING_EMAIL");
    const address = requiredEnv("QA_SHIPPING_ADDRESS");
    const profileName = `${fullName} QA ${runId()}`;
    const token = await apiToken(request, creds.email, creds.password);
    const storefront = await storefrontFor(request, token);
    let profileId: string | undefined;

    await signIn(page, creds.email, creds.password);
    await gotoRoute(page, storefront.productPath);
    await page.evaluate(() => localStorage.removeItem("order-store"));
    await page.reload();
    await page.getByRole("button", { name: /add to (cart|bag)/i }).first().click();
    await gotoRoute(page, "/cart");
    await expect(page.getByRole("button", { name: /proceed to checkout/i })).toBeVisible();
    await page.getByRole("button", { name: /proceed to checkout/i }).click();
    await expect(page).toHaveURL(/\/cart\/(?:shipping-profile\/new|complete-order\/review)/);

    try {
      if (!page.url().includes("/shipping-profile/new")) {
        await gotoRoute(page, "/cart/shipping-profile/new");
      }
      await expect(page.getByText("Add shipping profile", { exact: true }).first()).toBeVisible();
      await page.getByPlaceholder("Full name").fill(profileName);
      await page.getByPlaceholder("Phone number").fill(phone);
      await page.locator('input[name="Email"]').fill(email);
      await page.getByPlaceholder("Tap to select address").click();
      const addressSearch = page.getByPlaceholder("Search address or enter manually");
      await addressSearch.fill(address);
      await page.getByRole("button", { name: `Use: "${address}"` }).click();

      const [profileResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().endsWith("/shipping/add-shipping-profile") &&
          response.request().method() === "POST"
        ),
        page.getByRole("button", { name: "Add shipping profile" }).click(),
      ]);
      expect(profileResponse.ok(), `Shipping profile creation failed: ${await profileResponse.text()}`).toBeTruthy();
      const profileBody = await profileResponse.json();
      profileId = profileBody?.data?.id ?? profileBody?.data?.data?.id;
      expect(profileId, "The create response must identify the profile for cleanup.").toBeTruthy();
      await expect(page).toHaveURL(/\/cart\/complete-order\/review$/);
      await expect(page.getByRole("button", { name: "Pay Now" })).toBeVisible();

      const quoteResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith("/shipping/get-shipping-options") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Select", exact: true }).click();
      const quoteResponse = await quoteResponsePromise;
      expect(quoteResponse.ok(), `Delivery quote failed: ${await quoteResponse.text()}`).toBeTruthy();
      const quoteBody = await quoteResponse.json();
      const options = quoteBody?.data?.data ?? quoteBody?.data;
      expect(Array.isArray(options) && options.length > 0, "Staging must return at least one delivery option.").toBeTruthy();

      await expect(page.getByRole("heading", { name: "Select a delivery option" })).toBeVisible();
      const deliveryName = options[0]?.delivery_type;
      expect(deliveryName, "A delivery option must have a display name.").toBeTruthy();
      await page.getByRole("button", { name: new RegExp(String(deliveryName), "i") }).click();
      await expect(page.getByRole("heading", { name: "Select a delivery option" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Change", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Pay Now" })).toBeVisible();
    } finally {
      await page.evaluate(() => localStorage.removeItem("order-store"));
      if (!profileId) {
        const profilesResponse = await apiJson(
          request,
          "/shipping/get-user-shipping-profiles",
          { token }
        );
        const profiles =
          profilesResponse.json?.data?.data ?? profilesResponse.json?.data ?? [];
        const createdProfile = Array.isArray(profiles)
          ? profiles.find(
              (profile: any) =>
                profile?.street === address &&
                profile?.shipping_user?.email === email &&
                `${profile?.shipping_user?.firstname ?? ""} ${profile?.shipping_user?.lastname ?? ""}`.trim() ===
                  profileName
            )
          : undefined;
        profileId = createdProfile?.id;
      }
      if (profileId) {
        const deleted = await apiJson(request, `/shipping/delete-shipping-profile/${profileId}`, {
          token,
          method: "DELETE",
        });
        expect(deleted.ok, `Could not clean up shipping profile ${profileId}.`).toBeTruthy();
      }
    }
  });
});
