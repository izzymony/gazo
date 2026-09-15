import type { Page } from "@playwright/test";

/**
 * Sign in through the real UI.
 *
 * /signin is a landing screen: the form only appears after "Login to my
 * account", which moves the page to ?step=1.
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByRole("button", { name: /login to my account/i }).click();
  await page.locator("input[name='identifier']").fill(email);
  await page.locator("input[name='password']").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !/\/signin/.test(url.pathname), { timeout: 30_000 });
}

/**
 * Click a control and confirm it actually did something.
 *
 * Next serves the markup before React attaches handlers, so a click fired the
 * moment a button becomes visible can land on inert HTML: no error, no toast,
 * nothing happens. That race cost hours of chasing a phantom bug — the real
 * defect was there, but the evidence kept contradicting itself because half the
 * clicks were being dropped.
 *
 * Retries until `settled()` reports the effect, so the test measures the app
 * rather than the timing of hydration.
 */
export async function clickUntil(
  locator: import("@playwright/test").Locator,
  settled: () => Promise<boolean>,
  attempts = 5
) {
  await locator.waitFor({ state: "visible" });
  for (let i = 0; i < attempts; i++) {
    if (await settled()) return;
    await locator.click({ trial: false }).catch(() => {});
    await locator.page().waitForTimeout(1000);
    if (await settled()) return;
  }
  throw new Error(
    `Control did not take effect after ${attempts} clicks — either the handler is ` +
      `not wired up, or it is genuinely a no-op.`
  );
}
