import { test, expect } from "@playwright/test";
import path from "node:path";

test("seller can create a product from the catalog", async ({ page, context, baseURL }) => {
    test.slow();
  const productTitle = `Test Product ${Date.now().toString().slice(-6)}`;
  const productPrice = "1000";
  const productOldPrice = "1200";
  const productDescription = "A product created by the local Playwright workflow.";
  const inventory = "4";
  const productId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const categoryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const subcategoryId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  // `baseURL` rather than a hardcoded localhost — addCookies needs an absolute
  // URL, and this spec also runs against staging.
  await context.addCookies([
    {
      name: "accessToken",
      value: "mock-access-token",
      url: baseURL as string,
    },
  ]);

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
              email: "seller@example.com",
              phone: "+2348012345678",
            },
            business: {
              id: "mock-business-id",
              name: "Mock Store",
              tag: "mock-store",
            },
          },
        }),
      });
      return;
    }

    if (
      request.method() === "GET" &&
      url.pathname.endsWith("/categories/get-all-categories")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            data: [
              {
                id: categoryId,
                name: "Electronics",
                description: "Test category",
                created_at: "",
                updated_at: "",
                sub_categories: [
                  {
                    id: subcategoryId,
                    name: "Mobile Phones & Accessories",
                    description: "Test subcategory",
                    category_id: categoryId,
                    created_at: "",
                    updated_at: "",
                  },
                ],
              },
            ],
          },
        }),
      });
      return;
    }

    if (request.method() === "POST" && url.pathname.endsWith("/products")) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: productId,
            title: productTitle,
            description: productDescription,
            price: { price: Number(productPrice), old_price: Number(productOldPrice) },
            stock: Number(inventory),
            category_id: categoryId,
            sub_category_id: subcategoryId,
          },
        }),
      });
      return;
    }

    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { data: [] } }),
      });
      return;
    }

    // Deny by default. `continue()` here would forward any unmocked API call to
    // whatever is listening — including staging, when this spec is run with
    // playwright.staging.config.ts — so a rename in the app would quietly
    // create a real product instead of failing the test.
    await route.abort();
  });

// Relative: resolved against baseURL so this runs on any target.
await page.goto("/dashboard/catalog/product/create/manual/new");
await expect(page.getByRole("heading", { name: "Start Strong" })).toBeVisible();

  await expect(page).toHaveURL(/\/dashboard\/catalog\/product\/create\/manual\/new/);
  await expect(page.getByRole("heading", { name: "Start Strong" })).toBeVisible();

  const imageInput = page.locator('input[type="file"][accept="image/*"]');
  await imageInput.setInputFiles({
  name: "product.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  ),
});
  await expect(page.getByText("1 image added")).toBeVisible({ timeout: 15_000 });

  await page.locator('input[name="title"]').fill(productTitle);
  await page.locator('input[name="price"]').fill(productPrice);
  await page.locator('input[name="oldPrice"]').fill(productOldPrice);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/step=2/);

  // The description field is an InputField with type="textarea", which renders
  // an <input type="text"> — there is no <textarea> on this page.
  await page.locator('input[name="description"]').fill(productDescription);
  // The floating "Product category" label is pointer-events-none; the wrapper
  // div owns the click that opens the dialog.
  const categoryField = page.locator("div.cursor-pointer").filter({
    hasText: "Product category",
  });
  await expect(categoryField).toBeVisible();
  await categoryField.click();
  // Each row renders an emoji span alongside its name, so the row's text is
  // "📱Electronics" — match the name, not the row's exact text.
  await page.getByText("Electronics").click();
  await page.getByText("Mobile Phones & Accessories").click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/step=3/);

  await page.locator('input[name="inventoryStocks"]').fill(inventory);
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Product Preview")).toBeVisible();

  const createProductResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/products")
  );
  await page.getByRole("button", { name: "Publish" }).click();
  // `toBeOK` only applies to an APIResponse; this is a page Response.
  expect((await createProductResponse).status()).toBe(201);
  // Generous: the first visit to /dashboard/storefront in `next dev` compiles
  // the route on demand, which can outlast the default expect timeout.
  await expect(page).toHaveURL(/\/dashboard\/storefront\?status=new-product/, {
    timeout: 30_000,
  });
});