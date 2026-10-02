import { test, expect } from "@playwright/test";
import { requireSellerCredentials } from "../env.cjs";
import { signIn, gotoRoute, waitForHydration } from "../login";
import {
  apiToken,
  ownBusiness,
  ownProducts,
  taxonomy,
  productDetail,
  usableImages,
  runId,
  requireOptIn,
} from "./helpers/staging";
import { solidPng, uploadFile } from "./helpers/images";

/**
 * The seller's three-step product wizard, against live staging.
 *
 * The local counterpart (tests/qa/local-smokeweb/addproduct.spec.ts) drives the
 * same screens with `POST /products` intercepted, which proves the button is
 * wired but says nothing about whether the request the app ACTUALLY builds is one
 * the backend accepts — and that request is the interesting part here: base64
 * images that have to survive Cloudinary, and a category pair that has to be two
 * real taxonomy uuids or the publish handler refuses to send anything at all.
 *
 * Nothing is stubbed. The category comes from the live taxonomy, the image is a
 * real PNG, and the result is confirmed by re-reading the product from the API.
 *
 * Why it is opt-in: there is no DELETE /products/:id on the backend, so a
 * product created here is permanent. Running it on every pass would grow the QA
 * store by one live product per execution — see requireOptIn.
 */

const creds = requireSellerCredentials();

test.describe("Product creation on live staging", () => {
  test("the wizard publishes a product the API really stores", async ({ page, request }) => {
    requireOptIn(
      "QA_ALLOW_PRODUCT_CREATION",
      "a real product that the API cannot delete again (there is no DELETE /products/:id)"
    );

    // Creating needs the base64 image to travel through the backend, and it does
    // that at upload size. A real browser on staging behind Cloudflare.
    test.setTimeout(300_000);

    const token = await apiToken(request, creds.email, creds.password);
    const business = await ownBusiness(request, token);
    expect(
      business,
      "The seller has no store, so a product has nowhere to live — run `pnpm qa:seed` first."
    ).toBeTruthy();

    // Real ids from the live taxonomy. Hardcoding the local fixture's "Electronics"
    // pair would publish against rows that exist nowhere here.
    const tax = await taxonomy(request);

    const title = `QA Created ${runId()}`;
    const price = "1000";
    const comparePrice = "1200";
    const stock = "4";

    await signIn(page, creds.email, creds.password);

    // ── Step 1: images, title, price ────────────────────────────────────────
    await gotoRoute(page, "/dashboard/catalog/product/create/manual/new");
    await expect(page.getByRole("heading", { name: "Start Strong" })).toBeVisible({
      timeout: 60_000,
    });
    await waitForHydration(page);

    // A real PNG rather than the local suite's 1×1 pixel: the client resizes and
    // base64-encodes it, and the backend decodes that base64 into Cloudinary. An
    // https URL would not decode at all.
    await page
      .locator("input[type='file'][accept='image/*']")
      .first()
      .setInputFiles(uploadFile(`qa-created-${runId()}.png`, solidPng(256, [80, 140, 220])));

    // The counter is the check that preparation finished; the submit stays
    // disabled until it does.
    await expect(page.getByText("1 image added")).toBeVisible({ timeout: 60_000 });

    await page.locator("input[name='title']").fill(title);
    await page.locator("input[name='price']").fill(price);
    await page.locator("input[name='oldPrice']").fill(comparePrice);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/step=2/, { timeout: 60_000 });

    // ── Step 2: description and category ───────────────────────────────────
    await expect(page.locator("input[name='description']")).toBeVisible({ timeout: 30_000 });
    await page
      .locator("input[name='description']")
      .fill(`Created by the live staging QA suite (${runId()}).`);

    // The floating label is pointer-events-none; the wrapper div owns the click.
    const categoryField = page.locator("div.cursor-pointer").filter({
      hasText: "Product category",
    });
    await expect(categoryField).toBeVisible({ timeout: 30_000 });
    await categoryField.click();

    // Narrow the modal to the category the API named. Rows render an emoji span
    // beside their name, so match the name itself rather than the row's text.
    const search = page.getByPlaceholder("Select category");
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill(tax.categoryName);

    await page.getByText(tax.categoryName, { exact: true }).first().click();
    // Subcategories only render once the parent is expanded; `.last()` because a
    // name can appear in more than one row.
    await page.getByText(tax.subCategoryName, { exact: true }).last().click();

    // The picker closes on selection and renders "Category > Sub-category", built
    // from the ids it resolved BY ID. So this text is the assertion that the real
    // taxonomy pair — not a hardcoded fallback uuid — is what will be submitted.
    await expect(
      page.getByText(`${tax.categoryName} > ${tax.subCategoryName}`, { exact: true })
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/step=3/, { timeout: 60_000 });

    // ── Step 3: inventory, then preview and publish ─────────────────────────
    await expect(page.locator("input[name='inventoryStocks']")).toBeVisible({ timeout: 30_000 });
    await page.locator("input[name='inventoryStocks']").fill(stock);

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByText("Product Preview")).toBeVisible({ timeout: 30_000 });

    const created = page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        new URL(res.url()).pathname.endsWith("/products")
    );
    await page.getByRole("button", { name: "Publish" }).click();
    const response = await created;
    expect(
      response.status(),
      `The publish request failed: ${response.status()} ${(await response.text()).slice(0, 300)}`
    ).toBe(201);

    // ── The real assertion: what the server now holds ───────────────────────
    let createdId = "";
    await expect
      .poll(
        async () => {
          const match = (await ownProducts(request, token, business!.id)).find(
            (p) => p.title === title
          );
          createdId = match?.id ?? "";
          return match ?? null;
        },
        { timeout: 60_000, message: `no product titled "${title}" appeared on the seller account` }
      )
      .toBeTruthy();

    const stored = await productDetail(request, createdId);
    expect(stored).toBeTruthy();
    expect(stored!.title).toBe(title);
    expect(stored!.category_id).toBe(tax.categoryId);
    expect(stored!.sub_category_id).toBe(tax.subCategoryId);
    expect(Number(stored!.stock)).toBe(Number(stock));
    expect(Number(typeof stored!.price === "object" ? stored!.price?.price : stored!.price)).toBe(
      Number(price)
    );

    // The image has to have become a URL a browser can fetch. An empty string, or
    // a localhost URL, means the backend fell back to local file storage and the
    // seller's product would show a broken photo on staging.
    expect(
      usableImages(stored).length,
      `product ${createdId} stored no fetchable image URL: ${JSON.stringify(stored!.image)}`
    ).toBeGreaterThanOrEqual(1);

    // The wizard's post-publish redirect, which is also what tells a seller the
    // product exists.
    await expect(page).toHaveURL(/\/dashboard\/storefront\?status=new-product/, {
      timeout: 60_000,
    });

    // Named in the log on purpose: nothing can delete it, so whoever reads the
    // report needs the id to archive it by hand.
    console.log(
      `[catalog-create] product ${createdId} "${title}" was created on ${tax.categoryName} ` +
        `and cannot be deleted through the API — archive it by hand if the QA store gets noisy.`
    );
  });
});