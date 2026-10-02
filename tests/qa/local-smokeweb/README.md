# Local web workflow tests

This directory contains browser-level checks for the locally running Vibaar web app. They use the repository-root `playwright.config.ts` and its Chromium project. The app is expected at `http://localhost:3000`.

## Covered flows

### Homepage smoke check

`webtest.spec.ts` opens `/` and checks that the page title contains `Vibaar`. This confirms the home route loads with the expected title; it does not verify homepage content or any backend services.

### User signup

`webtest.spec.ts` exercises the three signup stages at `/signup?step=1`:

1. Enters a generated email address and submits the contact step.
2. Enters and confirms a password.
3. Enters a full name, generated username, and phone number, then submits registration.
4. Checks for navigation to `/welcome`, `/shop`, or `/dashboard`.

The test stubs `validate-email-or-phone` and `auth/register`, so those endpoints do not require a live backend and no real account is created. The final URL assertion accepts several destinations and does not verify a persisted account or authenticated session.

### User login

`webtest.spec.ts` opens `/login`, enters an email, submits it, enters a password, and expects navigation to `/welcome`, `/shop`, or `/dashboard`.

This test currently types the literal value `[EMAIL_ADDRESS]` and does not stub the login API. It therefore is not a self-contained happy-path test: it needs a valid test account and working auth service, and the placeholder must be replaced with that account's email before it can reliably pass. It does not create or configure credentials itself.

### Forgot password

`webtest.spec.ts` opens `/forgot-password`, enters an email, submits, and expects navigation to `/reset-password`.

Like login, this test types the literal `[EMAIL_ADDRESS]` and does not stub the request. It requires the app's password-recovery endpoint to be available; replace the placeholder with an appropriate test email. The test checks navigation only, not message delivery or completion of a password reset.

### Product browsing

`webtest.spec.ts` opens `/`, waits for a visible `div[data-testid='product-card']`, clicks the first matching card, and expects a `/product/...` URL. It needs at least one product card to be rendered, so the web app's product data source must be available and populated. It does not mock product data or verify product details after navigation.

### Store creation

`store-creation.spec.ts` covers the seller's two-step store setup wizard:

1. Opens `/dashboard/storefront/create` and enters a generated store name and handle.
2. Selects the `Fashion Store` category and continues, leaving the default personal-contact setting enabled.
3. Enters `Lagos` as the state/province on the address step. The country is fixed to Nigeria.
4. Finishes setup and checks that the browser is redirected to a `/dashboard` URL.

The test seeds an `accessToken` cookie and intercepts `GET **/users/me` with a mock user who has no business, allowing the protected route to load without real credentials or a running auth backend. It also intercepts `POST **/business` and returns a successful mock store response, so no persistent store is created. The test checks the final redirect, not the submitted request payload or the rendered contents of the destination dashboard.

### Product creation

`addproduct.spec.ts` walks the seller's three-step product wizard at `/dashboard/catalog/product/create/manual/new`:

1. Opens the catalog and follows the `Add product` action to the wizard.
2. Uploads one image from `apps/web/public`, then enters a title, a price and a higher old price.
3. Enters a description and picks `Electronics` > `Mobile Phones & Accessories` from the category dialog.
4. Enters a stock quantity, previews the draft and publishes it.

The test seeds an `accessToken` cookie and intercepts `GET **/users/me`, `GET **/categories/get-all-categories` and `POST **/products`, so no backend is required and no product is persisted. It checks the wizard's rendered steps, that the create request is sent and answered, and the post-publish redirect; it does not verify the request payload or any resulting catalog contents.

Note: the category dialog's name label is `pointer-events-none` and each category row renders an emoji next to its name, so the test clicks the field's wrapper div and matches category names without `exact`.

## Prerequisites

- Node.js 20 or newer and pnpm 9, as specified by the repository.
- Dependencies installed from the repository root with `pnpm install`.
- Chromium installed for Playwright. On a fresh setup, run `pnpm exec playwright install chromium`.
- The web app running locally on port 3000. Start it from the repository root with `pnpm --filter @vibaar/web dev`.
- For product browsing, at least one product must be available. Login and forgot-password need a test email and working auth service as described above. Store creation supplies its own mocked authenticated session.

## Run the tests

Run all local smoke-web specs from the repository root:

```bash
pnpm exec playwright test tests/qa/local-smokeweb --config=playwright.config.ts --project=chromium
```

Run one spec or one named workflow:

```bash
pnpm exec playwright test tests/qa/local-smokeweb/webtest.spec.ts --config=playwright.config.ts --project=chromium
pnpm exec playwright test tests/qa/local-smokeweb/store-creation.spec.ts --config=playwright.config.ts --project=chromium
pnpm exec playwright test tests/qa/local-smokeweb/addproduct.spec.ts --config=playwright.config.ts --project=chromium
pnpm exec playwright test tests/qa/local-smokeweb/webtest.spec.ts --config=playwright.config.ts --project=chromium --grep "signup"
```

The specs navigate directly to `http://localhost:3000`; changing `QA_WEB_URL` alone will not change their destination. Update their `page.goto` calls before targeting a different host.

The root config retains a trace and screenshot on failure and writes an HTML report without opening it automatically. View the report with:

```bash
pnpm exec playwright show-report
```

## Troubleshooting

- **Connection refused or navigation timeout:** confirm the web app is serving at `http://localhost:3000`.
- **Store creation redirects to login:** confirm the test's `accessToken` cookie is added before navigation and the `/users/me` response stub matches the app's request URL.
- **No product card appears:** confirm the products API/source is reachable and returns at least one product.
- **Login or recovery fails:** replace `[EMAIL_ADDRESS]` in the corresponding test with a suitable test account/email and ensure the auth service is available.
- **Category not found:** confirm the store category picker still exposes `Fashion Store`; store creation depends on that visible option.
- **Product wizard step never advances:** `handleNextStep` validates the whole step, so an empty image, title, price, description or category shows a toast and stays put; the image counter (`1 image added`) is the check that upload preparation finished.
- **Store submission reaches a real API:** confirm the request is `POST` to a URL matched by `**/business`. Other methods are passed through by the route handler.
