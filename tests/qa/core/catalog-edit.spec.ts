import { test, expect } from "@playwright/test";
import { requireSellerCredentials } from "../env.cjs";
import { signIn, gotoRoute, waitForHydration } from "../login";
import {
  apiToken,
  ownBusiness,
  editFixture,
  productDetail,
  usableImages,
  runId,
} from "./helpers/staging";
import { noisePng, uploadFile } from "./helpers/images";

/**
 * Editing a real product on staging.
 *
 * The local counterpart (editproducts.spec.ts) captures the PUT payload that
 * the app built and asserts on it — which is how it proves the form is wired to
 * the right endpoint with the right field names. That still works here, and it is
 * the sharper assertion: the request is OBSERVED, not intercepted, so the
 * numbers in it came from the real environment.
 *
 * Two things are non-negotiable in this file:
 *
 *   - The fixture is found by the description marker the seeder writes, so it is
 *     never the same row seller.spec renames, and never the photo fixture.
 *   - Everything is restored in `finally`, and a failed restore throws rather
 *     than warning: staging is shared, and a leftover rename breaks the NEXT run
 *     in a way that looks like a product bug.
 */

const creds = requireSellerCredentials();

/** A v4 uuid — the shape `isTaxonomyId` insists on before any PUT is built. */
const TAXONOMY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Read the gallery counter ("2 images added • Drag to reorder"). */
async function imageCount(page: import("@playwright/test").Page): Promise<number> {
  const text = await page
    .getByText(/images? added/)
    .first()
    .textContent()
    .catch(() => null);
  const matched = text?.match(/(\d+)\s+images?\s+added/);
  return matched ? Number(matched[1]) : -1;
}

test.describe("Product edit on live staging", () => {
  /**
   * Two navigations of the edit form (edit, then restore) inside one budget.
   * The default 45s left the restore with nothing and the rename stuck.
   */
  test("price and title changes land on the server and survive a reload", async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);

    const token = await apiToken(request, creds.email, creds.password);
    const business = await ownBusiness(request, token);
    expect(business, "No store on this seller account — run `pnpm qa:seed` first.").toBeTruthy();

    const fixture = await editFixture(request, token, business!.id);
    const before = await productDetail(request, fixture.id);
    expect(before, `Fixture ${fixture.id} could not be read back.`).toBeTruthy();

    // Strip any marker a previously failed run left behind, so this run also
    // REPAIRS earlier pollution instead of compounding it.
    const baseTitle = String(before!.title).replace(/\s*\[qa [^\]]*\]/g, "").trim();
    const basePrice = Number(
      typeof before!.price === "object" ? before!.price?.price : before!.price
    );
    const baseCompare = Number(
      typeof before!.price === "object" ? before!.price?.old_price : 0
    );

    const editedTitle = `${baseTitle} [qa ${runId()}]`;
    const newPrice = "1500";
    // Must exceed the price: the form's `price-relationship` rule rejects a
    // compare price that is not higher, and blocks the submit before any PUT.
    const newCompare = "2000";

    /**
     * The compare price to restore.
     *
     * A product whose stored old_price sits at or below its price cannot be
     * represented in this form at all — the same rule that blocks the edit blocks
     * the restore, and the fixture would be stuck renamed. Nudge it up by 1 in
     * that case, and only there.
     */
    const restoreCompare =
      baseCompare > 0 && baseCompare <= basePrice ? String(basePrice + 1) : String(baseCompare);

    await signIn(page, creds.email, creds.password);

    /**
     * One edit, whether it is the change under test or the restore.
     *
     * Server truth is polled, never a sleep and never the form still on screen:
     * a reload of a form that was never persisted looks identical to a save that
     * worked. That regression — "Product updated successfully!" over a write that
     * failed — is the reason this asserts on the API at all.
     */
    const applyEdit = async (title: string, price: string, compare: string) => {
      await gotoRoute(page, `/dashboard/catalog/product/create/manual/edit/${fixture.id}`);
      await waitForHydration(page);

      const titleField = page.locator("input[name='title']");
      await expect(titleField).toBeVisible({ timeout: 45_000 });
      // The form hydrates from the API after the route resolves, and a failed
      // fetch leaves it EMPTY. Filling that would write an empty title over a
      // real product, so the load itself is part of what is under test.
      await expect(titleField).not.toHaveValue("", { timeout: 45_000 });

      await titleField.fill(title);
      await page.locator("input[name='price']").fill(price);
      await page.locator("input[name='comparePrice']").fill(compare);

      const put = page.waitForResponse(
        (res) =>
          res.request().method() === "PUT" &&
          new URL(res.url()).pathname.endsWith(`/products/${fixture.id}`)
      );
      await page.getByRole("button", { name: "Update Product" }).click();
      const response = await put;
      expect(response.status(), `PUT /products/${fixture.id} failed`).toBe(200);

      // The observed payload, not a mock: it carries whatever the app built from
      // live data, so the assertions below are about the real request.
      const payload = response.request().postDataJSON() as Record<string, unknown>;

      await expect
        .poll(
          async () => {
            const current = await productDetail(request, fixture.id);
            return {
              title: current?.title,
              price: Number(
                typeof current?.price === "object" ? current?.price?.price : current?.price
              ),
            };
          },
          { timeout: 45_000, message: `the server never held "${title}" at ${price}` }
        )
        .toEqual({ title, price: Number(price) });

      return payload;
    };

    try {
      const payload = await applyEdit(editedTitle, newPrice, newCompare);

      expect(payload).toMatchObject({
        title: editedTitle,
        price: { price: Number(newPrice), old_price: Number(newCompare) },
      });

      /**
       * The category has to travel as a REAL taxonomy id.
       *
       * This form used to accept a name in the sub-category slot, and the payload
       * then carried something the API could not resolve — the update simply did
       * not land. Asserting the shape keeps that from returning silently, since
       * the picker was not touched by this test at all.
       */
      expect(String(payload.category_id)).toMatch(TAXONOMY_ID);
      expect(String(payload.sub_category_id)).toMatch(TAXONOMY_ID);

      // Stored is not the same as rendered: reload and read the form back.
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("input[name='title']")).toHaveValue(editedTitle, {
        timeout: 45_000,
      });
    } finally {
      try {
        await applyEdit(baseTitle, String(basePrice), restoreCompare);

        // The form recomputes the slug from the title, so restoring the title
        // restores the slug for every product whose slug was title-derived — which
        // is what the seeder creates. Checked rather than assumed, because a
        // drifted slug breaks the buyer URL built from it.
        const restored = await productDetail(request, fixture.id);
        expect(
          restored?.slug,
          `Fixture ${fixture.id} kept a stale slug after the title was restored`
        ).toBe(before!.slug);
      } catch (err) {
        throw new Error(
          `CLEANUP FAILED — product ${fixture.id} may still be named ` +
            `"${editedTitle}" instead of "${baseTitle}". Fix it before the next QA run, ` +
            `or the next pass asserts against the leftover.\nCause: ${String(err)}`
        );
      }
    }
  });

  test("a photo added while editing is stored, rendered, and removable", async ({
    page,
    request,
  }) => {
    // Uploading a real multi-megabyte file through a real browser, on staging,
    // behind Cloudflare. Then a second save to put the gallery back.
    test.setTimeout(300_000);

    const token = await apiToken(request, creds.email, creds.password);
    const business = await ownBusiness(request, token);
    expect(business).toBeTruthy();

    const fixture = await editFixture(request, token, business!.id);
    const before = await productDetail(request, fixture.id);
    const baseline = usableImages(before).length;
    expect(
      baseline,
      `Fixture ${fixture.id} holds no fetchable image URL, so "one more image" is meaningless. ` +
        `An empty string or a localhost URL means an earlier upload silently failed.`
    ).toBeGreaterThan(0);

    await signIn(page, creds.email, creds.password);

    const gallery = page.locator("input[type='file'][accept='image/*']").first();
    const update = page.getByRole("button", { name: "Update Product" });

    /**
     * Counts USABLE images, not array entries.
     *
     * Counting entries is the same trap as counting HTTP 200s: a save can report
     * success while storing empty strings, and the seller's photo is simply gone.
     * A stored image is an absolute URL a browser can fetch — `localhost` is not
     * one on a deployed environment, it means the backend fell back to local file
     * storage instead of Cloudinary.
     */
    const storedImages = async () => usableImages(await productDetail(request, fixture.id)).length;

    let added = false;
    try {
      await gotoRoute(page, `/dashboard/catalog/product/create/manual/edit/${fixture.id}`, gallery);
      await waitForHydration(page);

      expect(await imageCount(page), "the gallery counter disagrees with the API").toBe(baseline);

      await gallery.setInputFiles(uploadFile(`qa-edit-${runId()}.png`, noisePng(700)));

      // Client-side preparation (resize + re-encode) runs before the submit is
      // even allowed, so the counter is the check that it finished.
      await expect.poll(() => imageCount(page), { timeout: 120_000 }).toBe(baseline + 1);

      const put = page.waitForResponse(
        (res) =>
          res.request().method() === "PUT" &&
          new URL(res.url()).pathname.endsWith(`/products/${fixture.id}`)
      );
      await update.click();
      expect((await put).status()).toBe(200);

      await expect
        .poll(storedImages, {
          timeout: 120_000,
          message:
            `fixture ${fixture.id} never held ${baseline + 1} fetchable image URLs. ` +
            `Empty strings or localhost URLs mean the upload silently failed — check ` +
            `CLOUDINARY_URL / USE_LOCAL_FILE_STORAGE on this environment.`,
        })
        .toBeGreaterThanOrEqual(baseline + 1);
      added = true;

      // Stored is not the same as rendered: reload and count what a seller sees.
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(gallery).toBeAttached({ timeout: 60_000 });
      await expect.poll(() => imageCount(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(baseline + 1);
    } finally {
      // Put the gallery back. The form can delete a photo, so this test does not
      // need the missing product-delete endpoint. Only worth doing once the save
      // actually landed — and NOT with an early `return` here, which would
      // swallow whatever failure got us into this block.
      if (added) {
        try {
        await gotoRoute(page, `/dashboard/catalog/product/create/manual/edit/${fixture.id}`, gallery);
        await expect.poll(() => imageCount(page), { timeout: 60_000 }).toBeGreaterThanOrEqual(baseline + 1);

        // The last tile is the one just added: tiles carry alt `image-N`, 1-indexed.
        const extra = baseline + 1;
        await page.locator(`img[alt="image-${extra}"]`).first().click();
        const remove = page.getByRole("button", { name: "Delete image" });
        await expect(remove).toBeVisible({ timeout: 15_000 });
        await remove.click();

        await expect.poll(() => imageCount(page), { timeout: 30_000 }).toBe(baseline);

        const put = page.waitForResponse(
          (res) =>
            res.request().method() === "PUT" &&
            new URL(res.url()).pathname.endsWith(`/products/${fixture.id}`)
        );
        await update.click();
        expect((await put).status()).toBe(200);

        await expect
          .poll(storedImages, {
            timeout: 60_000,
            message: `the gallery on ${fixture.id} did not return to ${baseline} images`,
          })
          .toBe(baseline);
        } catch (err) {
          throw new Error(
            `CLEANUP FAILED — product ${fixture.id} keeps the extra QA photo. Delete it in the ` +
              `seller UI before the next run, or the count keeps climbing.\nCause: ${String(err)}`
          );
        }
      }
    }
  });
});