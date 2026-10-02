import type { Page } from "@playwright/test";

/**
 * Sign in through the real UI, landing straight on the form.
 *
 * This used to load /signin and click "Login to my account" to reveal the form.
 * That made EVERY authenticated journey depend on one landing transition — and
 * when the rebuilt auth scene left that button disabled mid-navigation, three
 * core tests failed before reaching a single assertion of their own. A shared
 * dependency that can stall is a shared point of failure.
 *
 * /signin?step=1 is the form directly (measured: ~1.8s to interactive on
 * staging). The landing CTA still has coverage — as its own smoke test, where a
 * failure names the real problem instead of taking the login path down with it.
 */
export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin?step=1", { waitUntil: "domcontentloaded" });

  const identifier = page.locator("input[name='identifier']");
  await identifier.waitFor({ state: "visible", timeout: 45_000 });
  await identifier.fill(email);
  await page.locator("input[name='password']").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await page.waitForURL((url) => !/\/signin/.test(url.pathname), { timeout: 45_000 });
}

/**
 * Wait until React has actually taken ownership of the DOM.
 *
 * Next serves a complete, interactive-looking page BEFORE hydration. Typing
 * into a form during that window is the most expensive mistake available in a
 * Playwright suite, because it fails silently and gets misdiagnosed: `fill` sets
 * the DOM value, dispatches an event nothing is listening for, and the
 * controlled input stays empty in React state. The submit then fails validation
 * against a field that visibly holds what was typed into it:
 *
 *   [c] Error: No request matching /api/v1/login fired
 *   alerts: ["Email is required", "Password is required"]
 *
 * which reads like a broken backend, not a timing problem.
 *
 * React attaches `__reactProps$`/`__reactFiber$` to DOM nodes as it hydrates, so
 * the presence of one is a real signal rather than a sleep-and-hope timeout.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("input, button, a");
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$")
      );
    },
    undefined,
    { timeout: 60_000 }
  );
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

/**
 * Navigate without waiting for `load`.
 *
 * `page.goto` defaults to waiting for the load event, which means every image,
 * font and third-party script on the page. On staging behind Cloudflare the
 * dashboard edit route blew a 45s test budget on assets the test never looks
 * at. `domcontentloaded` plus a route-specific locator waits for the thing the
 * test actually needs, and nothing else.
 *
 * Not `networkidle` either: it never settles against a dev server, whose HMR
 * socket stays open.
 */
export async function gotoRoute(
  page: import("@playwright/test").Page,
  path: string,
  marker?: import("@playwright/test").Locator
) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  if (marker) await marker.waitFor({ state: "visible", timeout: 45_000 });
}
