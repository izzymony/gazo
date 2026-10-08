import { test, expect } from "@playwright/test";
import { requireSellerCredentials } from "../env.cjs";
import { signIn, gotoRoute } from "../login";
import { apiJson, apiToken, ownBusiness } from "./helpers/staging";

const creds = requireSellerCredentials();

test.describe("Storefront appearance on live staging", () => {
  test("seller can save a background color and restore the original theme", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);

    const token = await apiToken(request, creds.email, creds.password);
    const business = await ownBusiness(request, token);
    expect(business, "No store exists on this seller account — run `pnpm qa:seed` first.").toBeTruthy();

    const settings = business!.business_setting?.personalised_settings;
    expect(settings?.background_color, "The staging store has no saved background color to restore.").toBeTruthy();
    expect(settings?.background_state, "The staging store has no saved background mode to restore.").toBeTruthy();

    const originalTheme = {
      background_color: settings!.background_color!,
      background_pattern: settings!.background_pattern ?? "",
      background_state: settings!.background_state!,
    };
    const testColor = originalTheme.background_color.toLowerCase() === "#5146cb"
      ? "#C61E21"
      : "#5146cb";

    const restoreTheme = async () => {
      const restored = await apiJson(
        request,
        `/business/${business!.id}/background/color`,
        { token, method: "PUT", data: originalTheme }
      );
      expect(restored.status, "The staging store's original appearance could not be restored.").toBe(200);

      await expect
        .poll(
          async () => {
            const current = await ownBusiness(request, token);
            const theme = current?.business_setting?.personalised_settings;
            return {
              color: theme?.background_color,
              pattern: theme?.background_pattern ?? "",
              state: theme?.background_state,
            };
          },
          { timeout: 30_000, message: "The original store appearance did not return on the API." }
        )
        .toEqual({
          color: originalTheme.background_color,
          pattern: originalTheme.background_pattern,
          state: originalTheme.background_state,
        });
    };

    await signIn(page, creds.email, creds.password);
    await gotoRoute(page, "/dashboard/storefront/customise");
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible({
      timeout: 45_000,
    });

    try {
      await page.getByRole("button", { name: "Colored Pattern" }).click();
      await page.getByRole("button", { name: `Select color ${testColor}` }).click();
      await expect(page.getByText(testColor, { exact: true })).toBeVisible();

      const save = page.waitForResponse(
        (response) =>
          response.request().method() === "PUT" &&
          new URL(response.url()).pathname.endsWith(`/business/${business!.id}/background/color`)
      );
      await page.getByRole("button", { name: "Save" }).click();
      const response = await save;
      expect(
        response.status(),
        `Saving the storefront theme failed with HTTP ${response.status()}`
      ).toBe(200);

      await expect(page.getByText("Theme updated successfully!")).toBeVisible({
        timeout: 30_000,
      });

      await expect
        .poll(
          async () => (await ownBusiness(request, token))?.business_setting?.personalised_settings?.background_color,
          { timeout: 30_000, message: "The selected theme color did not persist on staging." }
        )
        .toBe(testColor);
    } finally {
      await restoreTheme();
    }
  });
});
