import { test, expect } from "@playwright/test";
import { resolveTargets, requireSellerCredentials } from "../env.cjs";
import { signIn, gotoRoute } from "../login";
import { noisePng } from "./helpers/images";

const targets = resolveTargets();
const creds = requireSellerCredentials();

/** Found by DESCRIPTION, never by title — the title-edit test renames titles. */
const FIXTURE_MARKER = "qa-fixture:photo-upload";
const PHOTO_COUNT = 5;

/**
 * `noisePng` — a multi-megabyte PNG of pure noise — lives in helpers/images.ts
 * now that the other upload journeys need real bytes too. It used to be defined
 * here, and the local suite's 1×1 pixel fixture was never equivalent: it fits in
 * a `buffer` literal, so it skips every resize, re-encode and byte budget the
 * upload path actually spends.
 */

test.describe("Photo upload", () => {
  test("five large photos survive preparation, save and reload", async ({ page, request }) => {
    // Five multi-MB uploads through a real browser, on staging, behind
    // Cloudflare. The default budget is nowhere near enough.
    test.setTimeout(600_000);

    const listUrl = `${targets.api}/products?page=1&limit=100`;
    const before = await (await request.get(listUrl)).json();
    const beforeItems = before?.data?.data ?? [];
    const beforeCount = before?.total ?? beforeItems.length;

    const fixture = beforeItems.find((p: any) =>
      String(p?.description ?? "").startsWith(FIXTURE_MARKER)
    );
    expect(
      fixture,
      `No photo fixture on this environment (description starting "${FIXTURE_MARKER}") — run \`pnpm qa:seed\` first.`
    ).toBeTruthy();

    /**
     * Counts USABLE images, not array entries.
     *
     * Counting entries is the same trap as counting HTTP 200s: the first run of
     * this test stored five images and passed, and all five were empty strings —
     * the seller's photos were gone and the save had reported success. An image
     * is only an image if it has an absolute URL a browser can fetch, and
     * `localhost` is not one on a deployed environment (it means the backend
     * fell back to local file storage instead of Cloudinary).
     */
    const usableImagesOnServer = async () => {
      const r = await request.get(`${targets.api}/products/${fixture.id}`);
      const b = await r.json();
      const urls: string[] = b?.data?.product?.image ?? b?.data?.image ?? [];
      return urls.filter(
        (u) => typeof u === "string" && /^https?:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u)
      ).length;
    };

    const runId = Date.now().toString(36);
    const photos = Array.from({ length: PHOTO_COUNT }, (_, i) => ({
      name: `qa-photo-${runId}-${i + 1}.png`,
      mimeType: "image/png",
      buffer: noisePng(900), // ~2.4MB of incompressible pixels each
    }));
    const totalMb = photos.reduce((a, p) => a + p.buffer.length, 0) / 1024 / 1024;

    await signIn(page, creds.email, creds.password);

    const titleField = page.locator("input[name='title'], input[name='name']").first();
    await gotoRoute(page, `/dashboard/catalog/product/create/manual/edit/${fixture.id}`, titleField);

    const fileInput = page.locator("input[type='file']").first();
    await expect(fileInput).toBeAttached({ timeout: 60_000 });

    const started = Date.now();
    await fileInput.setInputFiles(photos);

    // The client prepares (resizes/re-encodes) before anything is submitted —
    // the race that `2a3ce51` closed. Confirm it actually ran rather than
    // assuming: the control disables itself while `preparing` is true.
    const preparing = page.locator("input[type='file'][disabled]").first();
    const sawPreparing = await preparing
      .waitFor({ state: "attached", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    await expect(fileInput).toBeEnabled({ timeout: 300_000 });
    const preparedMs = Date.now() - started;

    await page.getByRole("button", { name: /save|update|publish/i }).first().click();

    await expect
      .poll(usableImagesOnServer, {
        timeout: 300_000,
        message:
          `fixture ${fixture.id} never held ${PHOTO_COUNT} FETCHABLE image URLs. ` +
          `Empty strings or localhost URLs mean the upload silently failed — ` +
          `check CLOUDINARY_URL / USE_LOCAL_FILE_STORAGE on this environment.`,
      })
      .toBeGreaterThanOrEqual(PHOTO_COUNT);
    const publishMs = Date.now() - started;

    // Stored is not the same as rendered: reload and count what a seller sees.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(titleField).toBeVisible({ timeout: 60_000 });
    const rendered = page.locator("img[src*='cloudinary'], img[src^='http']");
    await expect
      .poll(() => rendered.count(), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(PHOTO_COUNT);

    console.log(
      `[photo-upload] ${PHOTO_COUNT} files, ${totalMb.toFixed(1)}MB — ` +
        `client preparation ${sawPreparing ? "observed" : "NOT observed"} (${preparedMs}ms), ` +
        `stored after ${publishMs}ms`
    );
    expect(sawPreparing, "client image preparation never became visible").toBe(true);

    // The fixture is reused, so nothing may have been created.
    const after = await (await request.get(listUrl)).json();
    expect(after?.total ?? 0, "product count must not change — the fixture is reused").toBe(
      beforeCount
    );
  });
});
