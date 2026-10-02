import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  CATEGORIES,
  PRODUCT,
  SHOP_VENDOR,
  SIGNED_IN_USER,
  VENDOR,
  detailEnvelope,
  listEnvelope,
  publicProductEnvelope,
} from "./fixtures";

/**
 * A stub of the backend for the local smoke-web suite, on the port the app
 * itself hardcodes.
 *
 * WHY THIS EXISTS. `page.route()` intercepts requests made by the BROWSER. Three
 * buyer routes resolve their data in the NEXT SERVER instead, through
 * `serverFetch` (`packages/api-client/src/serverFetch.ts:14`) — a bare Node
 * `fetch` that Playwright never sees:
 *
 *   app/(buyer)/[handle]/page.tsx:18          /businesses/by-tag/:handle
 *   app/(buyer)/[handle]/page.tsx:33          /products?business_id=
 *   app/(buyer)/[handle]/p/[slugAndId]/page.tsx:60,67   /p/:publicId, /business/:id
 *
 * `serverFetch` swallows failures and returns `null`, after which both pages
 * call `notFound()` — a HARD 404, not a degraded render. So without this
 * process, `/@{handle}` and every product page are untestable and mocking them
 * in the browser is impossible by construction.
 *
 * WHAT IT IS NOT. This is a fixture server for SSR reads, not a test double for
 * the app's behaviour. Per-test assertions still belong in `page.route` handlers
 * (see the existing addproduct/editstore specs) — this process is deliberately
 * STATIC, because `serverFetch` caches for 300s (`revalidate: 300`), so a
 * fixture that changed mid-run would be served stale from that cache anyway.
 */

export const STUB_PORT = Number(process.env.SMOKEWEB_STUB_PORT ?? 8088);

/**
 * Why the port is unavailable, phrased for the person who has to act on it.
 *
 * Kept in one place because it is printed in two very different situations: the
 * global setup (where it must not look like a crash) and the storefront specs
 * (where it must not look like a product bug).
 */
export const PORT_TAKEN_MESSAGE = [
  `The stub API could not bind :${STUB_PORT}.`,
  ``,
  `A real backend is almost certainly running there — the Go server binds the`,
  `dual-stack [::] wildcard, and the Next server's "localhost" resolves to ::1, so`,
  `it would read LIVE data while these tests asserted against fixtures. A stub`,
  `that loses this race is worse than no stub: it fails exactly like a broken page.`,
  ``,
  `Stop the backend and re-run:`,
  `  Get-NetTCPConnection -LocalPort ${STUB_PORT} -State Listen |`,
  `    Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ }`,
  ``,
  `SMOKEWEB_STUB_PORT moves the stub, but only helps if the dev server also points`,
  `at the new port — apps/web/.env.local currently pins NEXT_PUBLIC_API_BASE_URL to`,
  `http://localhost:${STUB_PORT}/api/v1.`,
].join("\n");

/**
 * The browser calls this origin cross-origin (localhost:3000 → localhost:8088)
 * and the API client attaches `Authorization`, which makes every one of those
 * calls preflighted. Without these headers the browser drops the response and
 * the app sees a network error where a fixture should have been.
 */
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,Accept,Guest-Id",
  "Access-Control-Max-Age": "600",
};

function send(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    ...CORS,
  });
  res.end(payload);
}

const notFound = (res: ServerResponse, what: string) =>
  send(res, 404, { error: `${what} not found` });

/**
 * `/shop/vendors` is the one endpoint whose RESULT has to vary per test — the
 * search spec needs a genuinely empty feed to reach the "No vendors found"
 * empty state. Everything else is fixed.
 *
 * A search term that matches nothing returns an empty list rather than 404: the
 * page distinguishes "loaded but nothing matched" from "couldn't load", and
 * asserting the wrong one would pass for the wrong reason.
 */
function shopVendors(search: string, category: string) {
  if (search) return listEnvelope([]);
  if (category && category !== SHOP_VENDOR.category) return listEnvelope([]);
  return listEnvelope([SHOP_VENDOR]);
}

export function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://localhost:${STUB_PORT}`);
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const { searchParams } = url;

  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  // ── Server-rendered reads. These are the reason this process exists. ──

  if (req.method === "GET" && /^\/businesses\/by-tag\//.test(path)) {
    const handle = decodeURIComponent(path.split("/").pop() ?? "");
    if (handle !== VENDOR.tag) return notFound(res, `store "${handle}"`);
    return send(res, 200, detailEnvelope(VENDOR));
  }

  // Excludes `/products/tags` deliberately: a bare prefix match here swallows
  // the tag route further down, and the page would then receive product objects
  // where it expects tag strings. Restating the exception at the broad match is
  // what keeps the two routes order-independent.
  if (req.method === "GET" && path.startsWith("/products") && path !== "/products/tags") {
    return send(res, 200, listEnvelope([{ ...PRODUCT }]));
  }

  if (req.method === "GET" && /^\/p\/[^/]+$/.test(path)) {
    const publicId = path.split("/").pop();
    if (publicId !== PRODUCT.public_id) return notFound(res, `product "${publicId}"`);
    return send(res, 200, publicProductEnvelope());
  }

  if (req.method === "GET" && /^\/business\/[^/]+$/.test(path)) {
    if (path.split("/").pop() !== VENDOR.id) return notFound(res, "business");
    return send(res, 200, detailEnvelope(VENDOR));
  }

  // ── Client-side reads. Reached only when a spec has NOT intercepted the
  //    browser call with `page.route`, which is the normal case for Phase 2. ──

  if (req.method === "GET" && path === "/shop/vendors") {
    return send(
      res,
      200,
      shopVendors(searchParams.get("search") ?? "", searchParams.get("category") ?? "")
    );
  }

  if (req.method === "GET" && path === "/categories/get-all-categories") {
    return send(res, 200, listEnvelope(CATEGORIES));
  }

  if (req.method === "GET" && path === "/users/me") {
    return send(res, 200, detailEnvelope({ user: SIGNED_IN_USER, business: VENDOR }));
  }

  if (req.method === "GET" && path === "/businesses") {
    return send(res, 200, listEnvelope([{ ...VENDOR }]));
  }

  if (req.method === "GET" && path === "/products/tags") {
    return send(res, 200, listEnvelope([...PRODUCT.tag]));
  }

  if (req.method === "GET" && path.startsWith("/business/get-store-analytics/")) {
    return send(res, 200, detailEnvelope({ store_rating: 4.6, products_sold: 12 }));
  }

  // `unwrap` tolerates a bare `{ data: T }`, but a list endpoint is expected to
  // hand back an array — an object here would make `.map` throw inside the page.
  if (req.method === "GET") return send(res, 200, listEnvelope([]));

  return notFound(res, `${req.method} ${path}`);
}

/**
 * Fail a spec, loudly, unless the stub is genuinely serving our fixtures.
 *
 * Probes the port rather than importing a flag from globalSetup: globalSetup
 * runs in the runner process and specs run in a worker, so any exported module
 * state reads `false` in both and cannot carry the truth.
 *
 * The probe asks for a fixture store by tag and checks the name comes back.
 * That distinguishes "the stub is up" from "a real backend is up" — the case
 * that matters, because a real backend on :8088 would make every storefront
 * assertion fail in a way that reads like a product bug while the actual cause
 * is that nothing is under test.
 */
export async function requireStub(
  request: import("@playwright/test").APIRequestContext
) {
  let body: string;
  try {
    const res = await request.get(
      `http://localhost:${STUB_PORT}/api/v1/businesses/by-tag/${VENDOR.tag}`
    );
    body = await res.text();
  } catch (error) {
    throw new Error(`${PORT_TAKEN_MESSAGE}\n\n(probe failed: ${String(error)})`);
  }

  if (!body.includes(VENDOR.name)) {
    throw new Error(
      `${PORT_TAKEN_MESSAGE}\n\n` +
        `The port answered, but not with the fixture — it returned:\n${body.slice(0, 300)}\n\n` +
        `So something other than this suite's stub is serving :${STUB_PORT}.`
    );
  }
}

/**
 * True when something is already listening.
 *
 * The probe deliberately binds with NO host, which on Windows means the
 * dual-stack `[::]` — the same wildcard the real Go backend binds (it was
 * listening on `[::]:8088`, not `127.0.0.1:8088`).
 *
 * That detail is load-bearing. An earlier version probed `127.0.0.1` and bound
 * the stub there too, and Windows allowed it alongside the backend's `[::]`
 * socket. The probe passed, the stub announced itself, and the Next server's
 * `localhost` resolved to `::1` — straight to the REAL backend. Every
 * storefront test then read live data and failed on a store the fixtures had
 * never heard of, which reads exactly like a broken page. Detecting the conflict
 * honestly is the whole point: a silent loss here is worse than no stub at all.
 */
function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(true));
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port);
  });
}

/**
 * Start the stub, or report why it could not.
 *
 * Returns a discriminated result rather than throwing. Throwing here would fail
 * the ENTIRE suite from globalSetup — including `public`, `shop` and `cart`,
 * which never touch a server-rendered fetch and would pass perfectly well
 * against a real backend. Losing the stub must cost exactly the specs that need
 * it (storefront + product detail), and those fail loudly via
 * `requireStub()` instead of reading live data and reporting a phantom bug.
 */
export async function startStubApi(port = STUB_PORT): Promise<
  { started: true; url: string; close: () => Promise<void> } | { started: false; reason: string }
> {
  if (await portInUse(port)) {
    return { started: false, reason: PORT_TAKEN_MESSAGE };
  }

  // No host, for the same dual-stack reason as the probe: this has to answer on
  // ::1 and 127.0.0.1 alike, because which one "localhost" resolves to is a
  // platform decision, not ours.
  const server = createServer(handle);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, resolve);
    });
  } catch (error) {
    return { started: false, reason: `${PORT_TAKEN_MESSAGE}\n\n(${String(error)})` };
  }

  return {
    started: true,
    url: `http://localhost:${port}/api/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}