import type { Locator, Page } from "@playwright/test";

/**
 * Navigate without waiting for `load`.
 *
 * `page.goto` defaults to the load event, which means every image, font and
 * script on the page. The buyer routes under test carry a hero slideshow and a
 * remote-image optimizer, and waiting on those buys nothing the assertions
 * look at.
 *
 * Not `networkidle` either: it never settles against a `next dev` server, whose
 * HMR socket stays open for the life of the process.
 */
/**
 * Wait until React has actually taken ownership of the DOM.
 *
 * Next serves a complete, interactive-looking page BEFORE hydration. Typing
 * into a form during that window is the single most expensive mistake available
 * in a Playwright suite, because it fails silently and then gets misdiagnosed:
 * `fill` sets the DOM value, dispatches an event nothing is listening for, and
 * the controlled input stays empty in React state. The test then fails at some
 * later, unrelated-looking assertion — a submit that "does nothing", or a
 * validation error contradicting what was literally typed into the field.
 *
 *   [c] Error: No request matching /api/v1/login fired
 *   alerts: ["Email is required", "Password is required"]
 *
 * which reads like a broken backend, not a timing problem.
 *
 * React attaches `__reactProps$`/`__reactFiber$` to DOM nodes as it hydrates, so
 * the presence of one is a real signal rather than a sleep-and-hope timeout.
 * Waiting on `load` is not enough: scripts can still be evaluating, and on a
 * dev server with a slow route the two are not ordered the way you would assume.
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

export async function gotoRoute(page: Page, path: string, marker?: Locator) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  if (marker) await marker.waitFor({ state: "visible", timeout: 30_000 });
}

/**
 * Click a control and confirm it actually did something.
 *
 * Next serves markup before React attaches handlers, so a click fired the
 * instant a control becomes visible can land on inert HTML: no error, no toast,
 * nothing happens. Retrying until `settled()` reports the effect makes the test
 * measure the app rather than the timing of hydration.
 */
export async function clickUntil(
  locator: Locator,
  settled: () => Promise<boolean>,
  opts: { attempts?: number; intervalMs?: number } = {}
) {
  const attempts = opts.attempts ?? 5;
  const intervalMs = opts.intervalMs ?? 1_000;
  await locator.waitFor({ state: "visible" });
  for (let i = 0; i < attempts; i++) {
    if (await settled()) return;
    await locator.click({ trial: false }).catch(() => {});
    await locator.page().waitForTimeout(intervalMs);
    if (await settled()) return;
  }
  throw new Error(
    `Control did not take effect after ${attempts} clicks — either the handler is ` +
      `not wired up, or it is genuinely a no-op.`
  );
}

/**
 * Click a control that fires a request and then navigates, and wait for both.
 *
 * `clickUntil` is the wrong tool for a submit that ends in a route change,
 * because it conflates two very different waits:
 *
 *   1. Is the click even handled? That is a hydration question and resolves in
 *      milliseconds once React attaches the handler.
 *   2. Has the resulting navigation landed? That is a compile question. Under
 *      `next dev` the destination may be compiled on first visit, which the
 *      config already measures at tens of seconds.
 *
 * Retrying until the URL appears therefore needs a long budget (and re-click
 * loops risk double-submitting a real form), while retrying until the REQUEST
 * appears only needs a short one. So: click until the request that proves the
 * handler fired is observed — then stop clicking, so the form submits once —
 * and give the navigation the full timeout afterwards.
 */
export async function submitOnce(
  page: Page,
  control: Locator,
  opts: { request: string | RegExp; url: RegExp; timeout?: number }
) {
  const { request, url } = opts;
  const timeout = opts.timeout ?? 60_000;
  const matches = (u: string) =>
    typeof request === "string" ? u.includes(request) : request.test(u);

  await control.waitFor({ state: "visible" });

  const seen: string[] = [];
  const listener = (r: { url: () => string }) => {
    if (matches(r.url())) seen.push(r.url());
  };
  page.on("request", listener as never);

  try {
    // Short budget on purpose: this only covers hydration, not the navigation.
    const deadline = Date.now() + 15_000;
    while (seen.length === 0 && Date.now() < deadline) {
      await control.click({ trial: false }).catch(() => {});
      await page.waitForTimeout(500);
    }
    if (seen.length === 0) {
      throw new Error(
        `No request matching ${request} fired after repeatedly clicking "${await control
          .innerText()
          .catch(() => "the control")}". Either the handler is not wired up, or the ` +
          `request was never made.`
      );
    }
  } finally {
    page.off("request", listener as never);
  }

  await page.waitForURL(url, { timeout });
}

/**
 * Give an authenticated seller context.
 *
 * `middleware.ts:16` gates `/dashboard` and `/setup` on the PRESENCE of an
 * `accessToken` cookie and never validates it, so a sentinel value is enough —
 * there is no login round-trip to mock. The real identity arrives separately via
 * `GET /users/me`, which `rootLayoutClient.tsx:29` fires on every page load.
 */
export async function signInAsSeller(
  context: import("@playwright/test").BrowserContext,
  baseURL?: string
) {
  await context.addCookies([
    {
      name: "accessToken",
      value: "mock-access-token",
      // addCookies needs an absolute URL. Falls back to localhost only when the
      // caller did not thread baseURL through, so a staging run can never
      // silently drop the cookie and look like a broken login.
      url: baseURL || "http://localhost:3000",
    },
  ]);
}