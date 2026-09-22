import { test, expect } from "@playwright/test";
import { resolveTargets, requireSellerCredentials } from "../env.cjs";
import { signIn, gotoRoute } from "../login";

const targets = resolveTargets();
// Throws at load if the credentials are absent, failing the core run. It used
// to skip, which reported green having tested no authenticated journey at all.
const creds = requireSellerCredentials();

test.describe("Seller core", () => {
  test("can sign in and reach the dashboard", async ({ page }) => {
    await signIn(page, creds.email, creds.password);
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
      data: { identifier: creds.email, email: creds.email, password: creds.password },
    });
    const token = (await auth.json())?.data?.access_token;
    expect(token, "could not log in via the API to find a product").toBeTruthy();

    const list = await request.get(`${targets.api}/products?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const products = (await list.json())?.data?.data ?? [];
    // Excludes the photo fixture deliberately: this test RENAMES what it picks,
    // and the fixture must keep a stable identity for its own test.
    const target = products.find(
      (p: any) => /^QA Test/.test(p?.title ?? "") && !/Photo Upload Fixture/i.test(p?.title ?? "")
    );
    // Fails rather than skips, for the same reason the credentials do: core
    // running against an unseeded environment must not report green.
    expect(
      target,
      "No QA seed product on this environment — run `pnpm qa:seed` first."
    ).toBeTruthy();

    // This test navigates the dashboard edit form twice — once to edit, once to
    // restore — and the restore runs inside the test's own budget. The default
    // 45s left cleanup with nothing, so it timed out and the rename stuck.
    test.setTimeout(150_000);

    // Strip any leftover marker before deriving the new title, so a previously
    // failed run cannot compound into "Cap [qa a] [qa b]" — and so this test
    // REPAIRS earlier pollution rather than adding to it.
    const baseTitle: string = String(target.title).replace(/\s*\[qa [^\]]*\]/g, "").trim();
    const runId = Date.now().toString(36);
    const editedTitle = `${baseTitle} [qa ${runId}]`;
    const titleSelector = "input[name='title'], input[name='name']";

    /**
     * Server truth, polled — not a sleep, and not the form still on screen.
     *
     * GET /products/:id nests the record under `data.product`, unlike the list
     * endpoint's `data.data[]`. Reading `data.title` here silently returned
     * undefined, so the poll could never match: it burned its full timeout, threw,
     * and left the cleanup in `finally` with no budget — which then reported a
     * misleading "element not found".
     */
    const titleOnServer = async () => {
      const r = await request.get(`${targets.api}/products/${target.id}`);
      const body = await r.json();
      return body?.data?.product?.title ?? body?.data?.title ?? null;
    };

    const setTitleViaUi = async (value: string) => {
      await gotoRoute(page, `/dashboard/catalog/product/create/manual/edit/${target.id}`);
      const field = page.locator(titleSelector).first();
      await expect(field).toBeVisible({ timeout: 30_000 });
      await field.fill(value);
      await page.getByRole("button", { name: /save|update|publish/i }).first().click();
      await expect
        .poll(titleOnServer, {
          timeout: 30_000,
          message: `the server never showed the title "${value}"`,
        })
        .toBe(value);
    };

    await signIn(page, creds.email, creds.password);

    try {
      await setTitleViaUi(editedTitle);

      // The actual assertion: it survives a RELOAD. Reading back the form you
      // just submitted proves nothing — the bug this guards against showed a
      // success toast over a write that never landed.
      await page.reload();
      await expect(page.locator(titleSelector).first()).toHaveValue(editedTitle, {
        timeout: 30_000,
      });
    } finally {
      // Restore, or the next `qa:seed` sees the original title missing and
      // creates ANOTHER product — staging grew two "QA Test Tee" rows this way.
      try {
        await setTitleViaUi(baseTitle);
      } catch (err) {
        throw new Error(
          `CLEANUP FAILED — product ${target.id} is still named "${editedTitle}" ` +
            `instead of "${baseTitle}". Rename it by hand before the next ` +
            `qa:seed, or seeding will create a duplicate.\nCause: ${String(err)}`
        );
      }
    }
  });
});
