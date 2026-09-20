#!/usr/bin/env node
/**
 * Seed one seller, one store and a few products into a QA environment.
 *
 * Goes through the PUBLIC API rather than the database seeder, for two reasons:
 * the Go seeder that creates logins is deliberately local-only (it seeds a
 * committed password), and driving the real endpoints means the seed itself
 * exercises the seller journey it is preparing to test.
 *
 * Idempotent: re-running logs in as the existing seller and only creates what
 * is missing, so it is safe to run before every QA pass.
 *
 * Usage:
 *   node scripts/qa/seed-staging.mjs                        # staging
 *   node scripts/qa/seed-staging.mjs --api-url=http://localhost:8088/api/v1
 *
 * Credentials come from QA_SELLER_EMAIL / QA_SELLER_PASSWORD when set, so the
 * same account can be reused by the core E2E specs.
 */
import zlib from "node:zlib";
import { resolveTargets } from "../../tests/qa/env.cjs";

/**
 * A real PNG, generated here rather than linked.
 *
 * ProductService treats every `image` entry as BASE64 and runs it through
 * helper.DecodeBase64Image — an https URL fails to decode and the whole create
 * returns a bare "something went wrong". Distinct colours per product so the
 * cards are told apart during manual QA.
 */
function solidPng(size, [r, g, b]) {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // 8-bit RGB
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.concat(Array.from({ length: size }, () => Buffer.from([r, g, b]))),
  ]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const pngDataUri = (rgb) =>
  `data:image/png;base64,${solidPng(256, rgb).toString("base64")}`;

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const apiFromArg = arg("api-url");
const targets = resolveTargets(
  apiFromArg ? { ...process.env, QA_API_URL: apiFromArg } : process.env
);

if (targets.isProduction) {
  console.error("Refusing to seed production. This script creates accounts and products.");
  process.exit(1);
}

const API = targets.api;

/**
 * Credentials come from the environment, with NO fallback.
 *
 * These used to default to a committed email and password. Anyone reading the
 * repo could then log into the staging QA account and change its products out
 * from under a QA run — the results would be wrong rather than merely stale.
 * A default that is convenient for one person is a shared credential for
 * everyone else.
 */
const EMAIL = process.env.QA_SELLER_EMAIL;
const PASSWORD = process.env.QA_SELLER_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error(
    "QA_SELLER_EMAIL and QA_SELLER_PASSWORD are required.\n\n" +
      "  export QA_SELLER_EMAIL='...'\n" +
      "  export QA_SELLER_PASSWORD='...'   # never pass secrets as arguments\n\n" +
      "Store them in your local ignored config, or the GitHub 'staging' Environment for CI."
  );
  process.exit(1);
}
const USERNAME = process.env.QA_SELLER_USERNAME || "qaseller";
const STORE_NAME = "QA Test Store";

let token = null;

async function call(path, { method = "GET", body, auth = true } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function ensureSeller() {
  // Register is idempotent-by-failure: an existing email simply fails and we
  // fall through to login. OTP is accepted by any non-production environment
  // (helper.OTPBypassAllowed), which is why this works without a mailbox.
  const reg = await call("/register", {
    method: "POST",
    auth: false,
    body: {
      firstname: "QA",
      lastname: "Seller",
      user_name: USERNAME,
      email: EMAIL,
      phone: "2348100000001",
      password: PASSWORD,
      auth_type: "email",
      otp: "123456",
    },
  });
  console.log(reg.ok ? "  seller registered" : `  seller exists or register refused (${reg.status})`);

  const login = await call("/login", {
    method: "POST",
    auth: false,
    body: { identifier: EMAIL, email: EMAIL, password: PASSWORD },
  });
  if (!login.ok) {
    throw new Error(
      `Login failed (${login.status}): ${JSON.stringify(login.json).slice(0, 300)}\n` +
        `If the account predates this script with a different password, set ` +
        `QA_SELLER_EMAIL/QA_SELLER_PASSWORD to matching values.`
    );
  }
  // Reach for the token explicitly. `data` carries BOTH access_token and a
  // nested `data` holding the user, so a generic unwrap chain finds the user
  // object first and concludes there is no token.
  const envelope = login.json?.data || login.json;
  token = envelope?.access_token || envelope?.accessToken || envelope?.token;
  if (!token) throw new Error(`No token in login response: ${JSON.stringify(login.json).slice(0, 300)}`);
  console.log("  logged in");
}

async function ensureStore() {
  // GET /business answers with a SINGLE business object for the caller, not a
  // list — treating it as an array made this create a second store every run.
  const mine = await call("/business");
  const existing = mine.json?.data?.id ? mine.json.data : null;
  if (existing) {
    console.log(`  store exists: ${existing.name} (${existing.id})`);
    return existing;
  }

  const created = await call("/business", {
    method: "POST",
    body: {
      name: STORE_NAME,
      tag: "qa-test-store",
      phone: "2348100000001",
      email: EMAIL,
      category: "Fashion",
      address: {
        country: "Nigeria",
        province: "Lagos",
        address_line: "1 QA Street, Lagos",
      },
    },
  });
  if (!created.ok) {
    throw new Error(`Create store failed (${created.status}): ${JSON.stringify(created.json).slice(0, 300)}`);
  }
  const store = created.json?.data?.data || created.json?.data || created.json;
  console.log(`  store created: ${store?.id ?? "(id unknown)"}`);
  return store;
}

async function firstCategory() {
  const res = await call("/categories/get-all-categories", { auth: false });
  const list = res.json?.data?.data || res.json?.data || [];
  const cat = list[0];
  if (!cat) {
    throw new Error(
      "No categories in this environment. The product taxonomy is applied by " +
        "migration 014_seed_product_taxonomy.sql, which the backend runs at startup " +
        "and records in schema_migrations — so an empty list means that migration " +
        "has not been deployed here yet, or failed. Check the deploy logs for " +
        "`migration applied: 014_seed_product_taxonomy.sql`; a failure rolls the " +
        "whole file back and leaves the version unrecorded, so the next deploy " +
        "retries it. `./backend seed` still works for local recovery, but it is no " +
        "longer how this data is meant to arrive."
    );
  }
  const sub = cat.sub_categories?.[0] || cat.subCategories?.[0];
  return { categoryId: cat.id, subCategoryId: sub?.id || cat.id };
}

async function ensureProducts(ids, store) {
  const wanted = [
    { title: "QA Test Tee", price: 7500, old: 9000, rgb: [247, 197, 45] },
    { title: "QA Test Sneakers", price: 32000, old: 40000, rgb: [45, 122, 247] },
    { title: "QA Test Cap", price: 4500, old: 5000, rgb: [64, 184, 120] },
  ];

  const mine = await call("/products?page=1&limit=100");
  const all = mine.json?.data?.data || mine.json?.data || [];
  const existing = new Set(
    (Array.isArray(all) ? all : [])
      .filter((p) => !store?.id || p?.business_id === store.id)
      .map((p) => p?.title)
  );

  for (const w of wanted) {
    if (existing.has(w.title)) {
      console.log(`  product exists: ${w.title}`);
      continue;
    }
    const res = await call("/products", {
      method: "POST",
      body: {
        title: w.title,
        description: `${w.title} — created by the QA seed script.`,
        image: [pngDataUri(w.rgb)],
        stock: 25,
        tag: ["qa", "test"],
        is_combination: false,
        status: "active",
        category_id: ids.categoryId,
        sub_category_id: ids.subCategoryId,
        price: { old_price: w.old, price: w.price },
        weight: 1, length: 10, width: 10, height: 5,
      },
    });
    console.log(
      res.ok
        ? `  product created: ${w.title}`
        : `  product FAILED: ${w.title} (${res.status}) ${JSON.stringify(res.json).slice(0, 200)}`
    );
  }
}

/**
 * The photo-upload test's fixture — created once, then REUSED.
 *
 * It is deliberately not one of the three catalogue products: the title-edit
 * test renames whatever it picks, and a fixture another test can rename is not
 * a fixture. It is found by a marker in its DESCRIPTION rather than by title,
 * for the same reason.
 *
 * Reused rather than created per run because there is no product-delete
 * endpoint — a per-run product could only be archived, so staging would grow one
 * dead row per run and the "product count unchanged" assertion would have to be
 * weakened to active-only.
 */
const FIXTURE_MARKER = "qa-fixture:photo-upload";

async function ensurePhotoFixture(ids, store) {
  const mine = await call("/products?page=1&limit=100");
  const all = mine.json?.data?.data || mine.json?.data || [];
  const existing = (Array.isArray(all) ? all : []).find((p) =>
    String(p?.description || "").startsWith(FIXTURE_MARKER)
  );
  if (existing) {
    console.log(`  photo fixture exists: ${existing.id}`);
    return existing;
  }

  const res = await call("/products", {
    method: "POST",
    body: {
      title: "QA Photo Upload Fixture",
      description: `${FIXTURE_MARKER} | baseline`,
      image: [pngDataUri([120, 120, 120])],
      stock: 5,
      tag: ["qa", "fixture"],
      is_combination: false,
      status: "active",
      category_id: ids.categoryId,
      sub_category_id: ids.subCategoryId,
      price: { old_price: 1000, price: 900 },
      weight: 1, length: 10, width: 10, height: 5,
    },
  });
  console.log(
    res.ok
      ? "  photo fixture created"
      : `  photo fixture FAILED (${res.status}) ${JSON.stringify(res.json).slice(0, 160)}`
  );
  return res.json?.data?.product || res.json?.data || null;
}

console.log(`Seeding ${targets.label} via ${API}`);
await ensureSeller();
const ids = await firstCategory();
const store = await ensureStore();
await ensureProducts(ids, store);
await ensurePhotoFixture(ids, store);
// Names, never values. This used to echo the password on every successful run,
// which put it into terminal scrollback and CI logs — worse than the committed
// default it came from, because those logs are retained and shared.
console.log("\nDone. The core specs read the same two variables:");
console.log("  QA_SELLER_EMAIL, QA_SELLER_PASSWORD");
