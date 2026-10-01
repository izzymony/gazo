import { test, expect } from "@playwright/test";

const BUSINESS_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const BUSINESS = {
  id: BUSINESS_ID,
  name: "Mock Store",
  tag: "mock-store",
  category: "Fashion & Apparels",
  logo: null,
  email: "seller@example.com",
  phone: "08012345678",
  address: {
    country: "Nigeria",
    province: "Lagos",
    address_line: "",
    address_line_two: null,
  },
  business_setting: { shipping_amount: 0, shipping_type: "INSTASHOP",  personalised_settings: {
    background_color: "#3AC61E",
    background_image: "",
    background_state: "color",
    background_pattern: "/pattern1.svg",
  }, },
  instagram_profile: "izzy",
  tiktok_profile: "elenu razor",
  facebook_profile: "juice",
  whatsapp_profile: "",
  x_profile: "",
  business_bank_account_detail: [],
 
};

test("seller can update store details", async ({ page, context, baseURL }) => {
  test.slow(); // first visit to a seller route in `next dev`
  const newName = `Renamed Store ${Date.now().toString().slice(-6)}`;
  const newEmail = "newseller@example.com";
  const newPhone = "08087654321";

  // middleware.ts only checks that this cookie exists; it never validates it.
  await context.addCookies([
    {
      name: "accessToken",
      value: "mock-access-token",
      url: baseURL as string,
    },
  ]);

  let putPayload: Record<string, unknown> | undefined;
  let putUrl = "";

  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    // getMe() reads response.data.data.user / .business (authStore.ts:740).
    // user.business.id must exist or the Save handler silently does nothing
    // (details/page.tsx:160).
    if (request.method() === "GET" && path.endsWith("/users/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: "mock-user-id",
              email: BUSINESS.email,
              phone: "+2348012345678",
              business: { id: BUSINESS_ID },
            },
            business: BUSINESS,
          },
        }),
      });
      return;
    }

    // updateStore() PUTs the whole payload here and sets `store` from
    // response.data.data (businessStore.ts:1958-1968).
    if (request.method() === "PUT" && path.endsWith(`/business/${BUSINESS_ID}`)) {
      putUrl = request.url();
      putPayload = request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ...BUSINESS, ...putPayload } }),
      });
      return;
    }

    // The onSubmit callback refetches via fetchStores() -> GET /businesses.
    if (request.method() === "GET" && path.endsWith("/businesses")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { data: [{ ...BUSINESS, ...(putPayload ?? {}) }] },
        }),
      });
      return;
    }

    // Theme/background + anything else the shell asks for on load.
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { data: [] } }),
      });
      return;
    }

    // Deny by default. `continue()` would forward an unmocked API call to the
    // real backend — and this suite also runs against staging, where that
    // writes junk store data rather than failing the test.
    await route.abort();
  });




  await page.goto("/dashboard/storefront/details");

  await expect(page.getByRole("heading", { name: "Store Details" })).toBeVisible();

  // InputField hardcodes placeholder=" " on the native input and renders the
  // `placeholder` prop as a <label htmlFor>, so target the label, not the
  // placeholder (packages/ui/src/common/InputField.tsx:169,201).
  const nameInput = page.getByLabel("Store name");
  await expect(nameInput).toBeVisible();
  await expect(nameInput).toHaveValue(BUSINESS.name); // hydrated from getMe
  await nameInput.fill(newName);

  await page.getByLabel("Store email").fill(newEmail);
  await page.getByLabel("Store phone number").fill(newPhone);

  // storeTag is disabled once the tag exists (details/page.tsx:352), so the
  // handle cannot be part of this edit.
  await expect(page.getByLabel(/Store handle/)).toBeDisabled();

  const saveResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      new URL(response.url()).pathname.endsWith(`/business/${BUSINESS_ID}`)
  );
  await page.getByRole("button", { name: "Save" }).click();
  expect((await saveResponse).status()).toBe(200);

  // The page stays put after save, so assert on the submitted payload rather
  // than the URL.
  expect(putUrl).toContain(`/business/${BUSINESS_ID}`);
  expect(putPayload).toMatchObject({
    name: newName,
    email: newEmail,
    phone: newPhone,
    category: BUSINESS.category,
  });
  // The handler echoes the existing address/settings back; a partial payload
  // here would mean the edit wipes the store's province and shipping config.
  expect(putPayload).toMatchObject({
    address: { country: "Nigeria", province: "Lagos" },
    business_setting: { shipping_amount: 0, shipping_type: "INSTASHOP" },
  });

  
});

test("seller can set the store background image", async ({ page, context, baseURL }) => {
  test.slow(); // first visit to a seller route in `next dev`
  let body = "";
  let contentType = "";

  await context.addCookies([
    { name: "accessToken", value: "mock-access-token", url: baseURL as string },
  ]);

  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (req.method() === "GET" && path.endsWith("/users/me")) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: {
          user: { id: "mock-user-id", email: "seller@example.com", business: { id: BUSINESS_ID } },
          business: BUSINESS, // background_state: "color" — opens on tab 0, so click into Image
        }}),
      });
      return;
    }

    if (req.method() === "POST" && path.endsWith(`/business/${BUSINESS_ID}/background/image`)) {
      contentType = req.headers()["content-type"] ?? "";
      body = req.postData() ?? "";
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { background_image: "https://cdn.example.com/bg.png" } }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { data: [] } }) });
  });

  await page.goto("/dashboard/storefront/customise");
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

  // Tab order is forced by theme.backgroundType, so the fixture decides
  // which tab opens first (page.tsx:37-43). background_state is "color"
  // here, so click into the Image tab explicitly.
  await page.getByRole("button", { name: "Image" }).click();

  // The input is className="hidden" but setInputFiles works on hidden inputs.
  await page.getByLabel("Upload background image").setInputFiles({
    name: "bg.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    ),
  });

  const upload = page.waitForResponse(
    (r) => r.request().method() === "POST" &&
      new URL(r.url()).pathname.endsWith(`/business/${BUSINESS_ID}/background/image`)
  );
  await page.getByRole("button", { name: "Save" }).click();
  expect((await upload).status()).toBe(200);

  expect(contentType).toContain("multipart/form-data");
  expect(body).toContain('name="file"');
  expect(body).toContain('filename="bg.png"');
  await expect(page.getByText("Theme updated successfully!")).toBeVisible();
});

test("seller can change the store appearance colour", async ({ page, context, baseURL }) => {
  test.slow();
  let payload: Record<string, unknown> | undefined;

  await context.addCookies([
    { name: "accessToken", value: "mock-access-token", url: baseURL as string },
  ]);

  await context.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;

    if (req.method() === "GET" && path.endsWith("/users/me")) {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ data: {
          user: { id: "mock-user-id", email: BUSINESS.email, business: { id: BUSINESS_ID } },
          business: BUSINESS,
        }}),
      });
      return;
    }

    if (req.method() === "PUT" && path.endsWith(`/business/${BUSINESS_ID}/background/color`)) {
      payload = req.postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ data: { background_color: "#5146cb" } }) });
      return;
    }

    await route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ data: { data: [] } }) });
  });

  await page.goto("/dashboard/storefront/customise");
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  // proves getMe hydrated the theme, not the #75B29D fallback
  await expect(page.getByText("#3AC61E")).toBeVisible();

  await page.getByRole("button", { name: "Select color #5146cb" }).click();
  await expect(page.getByText("#5146cb")).toBeVisible();

  const put = page.waitForResponse(
    (r) => r.request().method() === "PUT" &&
      new URL(r.url()).pathname.endsWith(`/business/${BUSINESS_ID}/background/color`)
  );
  await page.getByRole("button", { name: "Save" }).click();
  expect((await put).status()).toBe(200);

  expect(payload).toEqual({
    background_color: "#5146cb",
    background_pattern: "/pattern1.svg",
    background_state: "color",
  });
});