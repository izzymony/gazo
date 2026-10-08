import { test, expect } from "@playwright/test";

import { waitForHydration } from "./helpers/nav";

const PRODUCT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CATEGORY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SUBCATEGORY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BUSINESS_ID = "mock-business-id";

test("Edit product flow", async ({ page, context, baseURL }) => {
  test.slow();

  const newTitle = `Updated test Product ${Date.now().toString().slice(-6)}`;
  const newPrice = "1500";
  const oldPrice = "1200";
  // Must exceed the new price: the schema's `price-relationship` test rejects a
  // compare price that is not higher, so reusing the fixture's 1200 here would
  // block the submit before any PUT was built.
  const comparePrice = "2000";
  const newInventory = "4";

  await context.addCookies([
    {
      name: "accessToken",
      value: "mock-access-token",
      url: baseURL as string,
    },
  ]);

  let putPayload: Record<string, unknown> | undefined;

  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname.endsWith("/users/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: "mock-user-id",
              email: "mock-user@example.com",
              phone: "+2348012345678",
              business: {
                id: BUSINESS_ID,
                name: "Mock Store",
                tag: "mock-store",
              },
            },
            business: { id: BUSINESS_ID, name: "Mock Store", tag: "mock-store" },
          },
        }),
      });
      return;
    }

    if (request.method() === "GET" && url.pathname.endsWith(`/business/get-product/${PRODUCT_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: PRODUCT_ID,
            title: "Original Product",
            price: oldPrice,
            description: "A product created by the local Playwright workflow.",
            inventory: newInventory,
            // Snake case is what the component reads. With camelCase here it never
            // set `selectedCategory`, and the `isTaxonomyId` guard in
            // EditProductSetup.tsx:327 refused to submit — "Choose a product
            // category before updating." — so no PUT was ever sent.
            category_id: CATEGORY_ID,
            sub_category_id: SUBCATEGORY_ID,
            category: "electronics",
            image: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
            stock: 34,
            is_combination: false,
            variants: [],
          },
        }),
      });
      return;
    }

    // `/products/${id}` (plural) — the path `updateProduct` actually calls
    // (productStore.ts:716). The singular spelling here never matched, so this
    // route fell through to the catch-all below and the PUT was never captured.
    if (request.method() === "PUT" && url.pathname.endsWith(`/products/${PRODUCT_ID}`)) {
      putPayload = await request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "successful", data: { ...putPayload } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { data: [] } }),
    });
  });

  await page.goto(`/dashboard/catalog/product/create/manual/edit/${PRODUCT_ID}`);

  const titleInput = page.locator('input[name="title"]');
  await expect(titleInput).toBeVisible();

  // The edit form mounts before React attaches its handlers, so a click here can
  // land on inert markup — no PUT, no error, and `waitForResponse` then hangs
  // until the test times out. Waiting for hydration makes the click meaningful.
  await waitForHydration(page);

  // The title is populated from the product fetch, which resolves after the
  // route has compiled on demand. The default 5s expect timeout loses that race
  // on a cold `next dev` server and reports an EMPTY form, which then looks
  // like a broken fixture — and, worse, leaves the form too empty for Update to
  // pass validation, so no PUT is ever sent. Wait for the data, generously.
  await expect(titleInput).toHaveValue("Original Product", { timeout: 30_000 });
  await titleInput.fill(newTitle);

  // The assertions below cover price, so the test has to actually edit price.
  await page.locator('input[name="price"]').fill(newPrice);
  await page.locator('input[name="comparePrice"]').fill(comparePrice);

  const putResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname.endsWith(`/products/${PRODUCT_ID}`)
  );

  await page.getByRole("button", { name: "Update Product" }).click();

  const response = await putResponse;
  expect(response.status()).toBe(200);

  expect(putPayload).toMatchObject({
    title: newTitle,
    category_id: CATEGORY_ID,
    sub_category_id: SUBCATEGORY_ID,
    is_combination: false,
    price: { price: Number(newPrice), old_price: Number(comparePrice) },
  });
});

test("seller can add an image while editing a product", async ({ page, context, baseURL }) => {
  test.slow();

  let putPayload: Record<string, unknown> | undefined;

  await context.addCookies([
    {
      name: "accessToken",
      value: "mock-access-token",
      url: baseURL as string,
    },
  ]);

  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (req.method() === "GET" && path.endsWith("/users/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: "mock-user-id",
              email: "seller@example.com",
              business: { id: BUSINESS_ID },
            },
            business: { id: BUSINESS_ID, name: "Mock Store", tag: "mock-store" },
          },
        }),
      });
      return;
    }

    if (req.method() === "GET" && path.endsWith(`/business/get-product/${PRODUCT_ID}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: PRODUCT_ID,
            title: "Original Product",
            price: "1200",
            description: "A product created by the local Playwright workflow.",
            inventory: "4",
            category_id: CATEGORY_ID,
            sub_category_id: SUBCATEGORY_ID,
            category: "electronics",
            image: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
            stock: 34,
            is_combination: false,
            variants: [],
          },
        }),
      });
      return;
    }

    if (req.method() === "PUT" && path.endsWith(`/products/${PRODUCT_ID}`)) {
      putPayload = await req.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "successful", data: { ...putPayload } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { data: [] } }),
    });
  });

  await page.goto(`/dashboard/catalog/product/create/manual/edit/${PRODUCT_ID}`);

  await expect(page.getByText("1 image added")).toBeVisible();

  // Same hydration gate as the first test: uploading and clicking before React
  // is live leaves the submit inert and the PUT never happens.
  await waitForHydration(page);
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name: "new.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    ),
  });

  await expect(page.getByText("2 images added")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update Product" })).toBeEnabled();

  const putResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname.endsWith(`/products/${PRODUCT_ID}`)
  );

  await page.getByRole("button", { name: "Update Product" }).click();

  const response = await putResponse;
  expect(response.status()).toBe(200);

  const images = putPayload?.image as string[];
  expect(images).toHaveLength(2);
  expect(images[0]).toBe("https://res.cloudinary.com/demo/image/upload/sample.jpg");
  expect(images[1]).toMatch(/^data:image\/(png|webp);base64,/);
});
