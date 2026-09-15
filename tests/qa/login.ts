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
