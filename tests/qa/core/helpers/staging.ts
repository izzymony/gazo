import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { resolveTargets } from "../../env.cjs";

/**
 * Real staging data for the core specs.
 *
 * The local suite (tests/qa/local-smokeweb) can assert on fixture values because
 * it OWNS the data: the stub serves the vendor, the product and the taxonomy,
 * and the specs import the same constants. Nothing here can do that — every
 * value has to be DISCOVERED from the environment first, or read back from it
 * after the write.
 *
 * Two rules follow, and they are the whole reason this file exists:
 *
 *   1. Never hardcode an id, a slug or a title. `storefrontFor()` and
 *      `taxonomy()` resolve them from the API, so the specs assert against
 *      whatever staging actually holds. A hardcoded uuid either 404s or — far
 *      worse — quietly matches a row nobody remembers creating.
 *   2. Assert against SERVER truth, polled. A form still showing what was just
 *      typed into it proves the fill worked, not the write. Every mutation here
 *      is confirmed by re-reading the API, and the specs restore what they
 *      changed.
 *
 * The targets come from tests/qa/env.cjs, which owns the production refusal —
 * imported, not reimplemented, so `pnpm qa:core` cannot drift into writing to
 * vibaar.com.
 */
export const targets = resolveTargets();

/** Loose shapes: the payloads are whatever the backend returns, and asserting
 *  a strict type here would only move a mismatch to compile time instead of
 *  naming the field that was missing. */
export interface StagingBusiness {
  id: string;
  name?: string;
  tag?: string;
  business_setting?: {
    shipping_amount?: number;
    shipping_type?: string;
    personalised_settings?: {
      background_color?: string;
      background_image?: string;
      background_pattern?: string;
      background_state?: string;
    };
  };
}

export interface StagingProduct {
  id: string;
  public_id?: string;
  slug?: string;
  title?: string;
  description?: string;
  business_id?: string;
  stock?: number;
  status?: string;
  image?: string[];
  category_id?: string;
  sub_category_id?: string;
  price?: number | { price?: number; old_price?: number };
}

export interface Taxonomy {
  categoryId: string;
  subCategoryId: string;
  categoryName: string;
  subCategoryName: string;
}

export interface Storefront {
  handle: string;
  storeName: string;
  businessId: string;
  product: StagingProduct;
  productPath: string;
}

/**
 * A short id for one run, so a run's leftovers are identifiable.
 *
 * Base36, so it stays inside a title and a URL without escaping.
 */
export function runId(): string {
  return Date.now().toString(36);
}

/**
 * ONE request helper.
 *
 * `request.fetch` rather than `request.get`/`request.post` so every call is
 * shaped the same way, and every non-2xx response carries the response body in
 * the thrown message. A bare `res.status()` for a create that returned 400 is
 * the difference between "it failed" and "category_id must be a valid uuid".
 */
export async function apiJson(
  request: APIRequestContext,
  path: string,
  opts: { token?: string; method?: string; data?: unknown; allowError?: boolean } = {}
) {
  const res = await request.fetch(`${targets.api}${path}`, {
    method: opts.method ?? "GET",
    data: opts.data as never,
    headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok() && !opts.allowError) {
    throw new Error(
      `${opts.method ?? "GET"} ${path} -> ${res.status()}\n${text.slice(0, 400)}`
    );
  }
  return { status: res.status(), ok: res.ok(), json };
}

/** Seller access token, straight from the API rather than through the UI. */
export async function apiToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const { json } = await apiJson(request, "/login", {
    method: "POST",
    // `identifier` is the field the app sends; `email` and `password` are kept
    // because Go's decoder is case-insensitive and other clients rely on them.
    data: { identifier: email, email, password },
  });

  // `data` carries BOTH the tokens and a nested `data` holding the user, so a
  // generic unwrap chain finds the user object first and concludes there is no
  // token — the same trap scripts/qa/seed-staging.mjs documents.
  const token = json?.data?.access_token ?? json?.data?.accessToken ?? json?.data?.token;
  expect(token, `No access token in the login response: ${JSON.stringify(json).slice(0, 300)}`).toBeTruthy();
  return String(token);
}

/**
 * The seller's OWN store.
 *
 * `GET /business` answers with a SINGLE object, not a list — treating it as an
 * array is what once made the seeder create a second store on every run. The
 * `data.data` fallback covers the older envelope.
 */
export async function ownBusiness(
  request: APIRequestContext,
  token: string
): Promise<StagingBusiness | null> {
  const { json } = await apiJson(request, "/business", { token, allowError: true });
  const candidate = json?.data?.id ? json.data : json?.data?.data?.id ? json.data.data : null;
  if (!candidate?.id) return null;

  // The theme lives under business_setting, and the update endpoints need the
  // business id — both have to come from the same record or a restore writes
  // the theme of a different store.
  return candidate as StagingBusiness;
}

/**
 * A product with a usable buyer URL.
 *
 * Must be IN STOCK: the product page's add-to-cart control is disabled at
 * zero, so picking one makes every cart assertion fail for the wrong reason.
 * Must carry `public_id` and `slug`: `/@handle/p/:slugAndId` parses the public
 * id out of the URL and 404s without one.
 */
function isBuyerReady(product: StagingProduct | undefined): product is StagingProduct {
  return Boolean(product?.public_id && product?.slug && (product?.stock ?? 0) > 0);
}

export function productPath(handle: string, product: StagingProduct): string {
  return `/@${handle}/p/${product.slug}-${product.public_id}`;
}

/** Every product on the seller's own store. */
export async function ownProducts(
  request: APIRequestContext,
  token: string,
  businessId: string
): Promise<StagingProduct[]> {
  const { json } = await apiJson(
    request,
    `/products?business_id=${encodeURIComponent(businessId)}&page=1&limit=100`
  );
  const items = json?.data?.data ?? json?.data ?? [];
  return Array.isArray(items) ? (items as StagingProduct[]) : [];
}

/**
 * One product, re-read from the server.
 *
 * `GET /products/:id` nests the record under `data.product` — unlike the list
 * endpoint's `data.data[]`. Reading `data.title` here yields undefined, so a
 * poll built on the wrong path can never match and burns its whole timeout.
 */
export async function productDetail(
  request: APIRequestContext,
  id: string
): Promise<StagingProduct | null> {
  const { json } = await apiJson(request, `/products/${id}`, { allowError: true });
  return (json?.data?.product ?? json?.data ?? null) as StagingProduct | null;
}

/** Images a browser could actually fetch — an entry that is not one is a lie. */
export function usableImages(product: StagingProduct | null): string[] {
  return (product?.image ?? []).filter(
    (u) => typeof u === "string" && /^https?:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u)
  );
}

/**
 * A store plus one of its buyable products, resolved from the API.
 *
 * The buyer journeys are the ones that cannot be faked: the storefront grid is
 * server-primed from `/products?business_id=`, so a product that is missing
 * there fails the same way a broken page would. Everything downstream
 * (storefront, product detail, stepper, cart) is built from what comes back.
 */
export async function storefrontFor(
  request: APIRequestContext,
  token: string
): Promise<Storefront> {
  const business = await ownBusiness(request, token);
  expect(
    business,
    `No store on this seller account — run \`pnpm qa:seed\` before \`pnpm qa:core\`.`
  ).toBeTruthy();
  expect(business!.tag, "The seeded store has no tag, so no buyer URL can be built.").toBeTruthy();

  const products = await ownProducts(request, token, business!.id);
  const product = products.find(isBuyerReady);
  expect(
    product,
    `No in-stock product with a public id on store ${business!.tag}. ` +
      `\`pnpm qa:seed\` creates three; check that it ran and that they are still active.`
  ).toBeTruthy();

  const handle = business!.tag as string;
  return {
    handle,
    storeName: business!.name ?? handle,
    businessId: business!.id,
    product: product!,
    productPath: productPath(handle, product!),
  };
}

/**
 * A real category and subcategory, for the pickers.
 *
 * The names come from the environment too: the local suite picked "Electronics"
 * because its stub only ever served that. Against live staging the ids have to
 * be real (the wizard refuses anything that is not a v4 uuid) and the click has
 * to land on the row the API actually returned.
 *
 * Picks the first category that HAS a subcategory — a category with none cannot
 * be completed, so choosing it would fail the wizard rather than the test.
 */
export async function taxonomy(request: APIRequestContext): Promise<Taxonomy> {
  const { json } = await apiJson(request, "/categories/get-all-categories");
  const categories = json?.data?.data ?? json?.data ?? [];
  expect(
    Array.isArray(categories) && categories.length > 0,
    "No categories in this environment. The taxonomy is seeded by migration " +
      "014; an empty list means it did not run here. See docs/QA-PLAYBOOK.md §2."
  ).toBe(true);

  const category = categories.find((c: any) => (c?.sub_categories ?? []).length > 0);
  expect(
    category,
    "Every category on this environment has zero subcategories, so no product can be categorised."
  ).toBeTruthy();

  const sub = category.sub_categories[0];
  return {
    categoryId: category.id,
    subCategoryId: sub.id,
    categoryName: category.name,
    subCategoryName: sub.name,
  };
}

/** The product the edit spec owns, found by the marker the seeder writes. */
export const EDIT_FIXTURE_MARKER = "qa-fixture:product-edit";

/**
 * A dedicated fixture for the edit specs.
 *
 * Found by DESCRIPTION, like the photo fixture: seller.spec renames whatever
 * `/^QA Test/` product comes first, so a spec that picked by title would be
 * renaming the same row as another spec, and one that renamed a fixture another
 * spec depends on would break that spec. `QA_PRODUCT_ID` overrides, for an
 * environment seeded by hand.
 */
export async function editFixture(
  request: APIRequestContext,
  token: string,
  businessId: string
): Promise<StagingProduct> {
  const explicit = process.env.QA_PRODUCT_ID;
  if (explicit) {
    const found = await productDetail(request, explicit);
    expect(found, `QA_PRODUCT_ID=${explicit} does not exist on ${targets.label}.`).toBeTruthy();
    return found!;
  }

  const products = await ownProducts(request, token, businessId);
  const fixture = products.find((p) =>
    String(p?.description ?? "").startsWith(EDIT_FIXTURE_MARKER)
  );
  expect(
    fixture,
    `No edit fixture on this environment (description starting "${EDIT_FIXTURE_MARKER}") — ` +
      `run \`pnpm qa:seed\` first.`
  ).toBeTruthy();
  return fixture!;
}

/**
 * The gate for a write this suite cannot undo.
 *
 * There is no DELETE /products/:id and no DELETE /business/:id on the backend —
 * the repositories have the methods, but no route exposes them. So creating a
 * product or an account through the UI leaves a permanent row, and running that
 * on every CI pass would quietly fill the QA store.
 *
 * These therefore SKIP unless the variable is set. That is a deliberate
 * exception to "missing setup FAILS the run": the alternative is a green run
 * that grows staging by one product per execution, which is a slower way to
 * break the environment. The skip reason names the variable, so the report says
 * what to do rather than looking like an absent feature.
 */
export function requireOptIn(variable: string, whatItLeaves: string) {
  if (process.env[variable] === "1") return;
  test.skip(
    true,
    `${variable}=1 is not set. This test creates ${whatItLeaves}, and the API has no ` +
      `endpoint to remove it, so a run that always created one would permanently ` +
      `grow the QA environment. Set ${variable}=1 for a pass that exercises it.`
  );
}