# vibaar — Deploy Guide

Turnkey steps to take the `vibaar` monorepo live. **Target stack: Cloudflare for the two frontends, Render for the backend and Postgres.**

Repo layout: `apps/web` (Next 14), `apps/admin` (Next 14), `services/backend` (Go + Gin). pnpm + turbo. CI at `.github/workflows/ci.yml`.

**CI status:** green on `main`. The **js** job runs `pnpm type-check`, `pnpm lint`, `pnpm test`; the **backend** job runs `go build`, `go vet`, `go test ./...` and the tagged `money_safety_repro` harness. Note the honest limit: the JS tests are still smoke-level, so CI protects the Go money paths far better than the frontend.

> **Read before you start.** Steps 1–2 are done. Steps 3–7 need owner accounts. Where something below has *not* been executed and verified end-to-end, it says so — nothing here is written as if it has been proven in production when it hasn't.

---

## 1. GitHub repo + push — ✅ done

Repo **[`Tinovalabs/vibaar`](https://github.com/Tinovalabs/vibaar)** (private). Go module is `github.com/Tinovalabs/vibaar/services/backend`. CI runs on every push.

> History was rewritten on 2026-08-28 to purge a committed DB dump and ~45 MB of dead assets. If you have an old clone anywhere, **re-clone it** — don't merge or pull.

## 2. Rotate secrets → new-brand provider accounts

Open fresh accounts/keys under vibaar and fill real `.env` files (templates are committed; real values never are).

| Env area | Keys |
|---|---|
| **Backend** (`services/backend/.env`) | DB (`DB_HOST/PORT/USER/PASSWORD/NAME` or `DB_DSN`), Paystack, Cloudinary, Shipbubble, mail/SMS, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `BVN_ENCRYPTION_KEY`, `KYC_PRIVATE_STORAGE`, Sentry DSN, Google/Instagram/TikTok OAuth |
| **Web** (`apps/web/.env.local`) | `NEXT_PUBLIC_API_BASE_URL`, Sentry, Google Maps, OAuth client IDs |
| **Admin** (`apps/admin/.env.local`) | `NEXT_PUBLIC_API_*`, Sentry |

Templates: `services/backend/.env.example`, `services/backend/sample.env`, `apps/admin/.env.example`.

Two that are easy to miss because they are **user-visible or boot-blocking**:

- **`SMS_ID` / `TERMII_SENDER_ID` / `SENDCHAMP_SENDER_NAME`** are the sender name on every OTP and alert SMS. They must be **registered with the provider** before they will send — Nigerian carriers silently reject or rewrite an unregistered sender ID. Register `Vibaar` when you open the accounts.
- **`BVN_ENCRYPTION_KEY`** is a hard requirement: a base64-encoded 32-byte key (or a raw 32-char string). Missing it is a **hard error** on the KYC path, not a warning. Generate with `openssl rand -base64 32`. **Losing this key makes every stored BVN unreadable** — store it in the same vault as your DB credentials, and never rotate it without a re-encryption plan.

- **`ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`** create the first admin, via an explicit `./backend seed` run. There is **no default admin** — the seeder used to hardcode a password published in this repo *and reset an existing admin's password to it on every run*, so a stray `seed` against production would have downgraded the live super-admin credential. It now refuses without these vars, requires 12+ characters, and never touches an existing admin. Create the admin once, then change the password after first login.

See **[KYC-PRODUCTION-RUNBOOK.md](./KYC-PRODUCTION-RUNBOOK.md)** for the KYC-specific env + verification checklist. Do not go live on KYC without walking it.

---

## 3. Cloudflare — web + admin

Two Workers, one per app, from the same repo.

### 3.1 Which Cloudflare product

Use **Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)** — *not* `@cloudflare/next-on-pages`.

The reason is concrete: `next-on-pages` requires every SSR route to opt into the **edge runtime**, and this app has none — there is not a single `export const runtime = 'edge'` in `apps/web/src`. The three server-rendered routes (`sitemap.ts`, `/@{handle}`, `/@{handle}/p/{slugAndId}`) plus `src/middleware.ts` all run on the Node runtime today. OpenNext supports the Node runtime; `next-on-pages` would mean rewriting them.

### 3.2 Setup, per app

```bash
cd apps/web            # then repeat for apps/admin
pnpm add -D @opennextjs/cloudflare wrangler
```

Add a `wrangler.jsonc` in the app directory:

```jsonc
{
  "name": "vibaar-web",                    // "vibaar-admin" for the admin app
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"], // required — the app uses Node APIs
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
}
```

Add scripts to that app's `package.json`:

```jsonc
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

Set env vars in the Cloudflare dashboard (Workers → Settings → Variables), or `wrangler secret put` for secrets. `NEXT_PUBLIC_*` values are inlined **at build time**, so they must be present when the build runs, not only at runtime.

Then attach custom domains: `vibaar.com` + `www.vibaar.com` → web worker; `admin.vibaar.com` → admin worker.

### 3.3 Known friction in *this* app — check these, don't assume

These are specific to what `apps/web` actually does. **None of this has been executed against a live Cloudflare account yet** — budget a session for the first deploy.

| Area | What to expect |
|---|---|
| **`next/image`** (28 files) | The default Next image optimizer needs a Node server with `sharp`. On Workers you need Cloudflare Images, or a custom loader, or `images.unoptimized: true`. **Decide this before launch** — getting it wrong degrades every product image on 3G, which is the exact audience. |
| **`next-pwa`** | Generates `public/sw.js` via a webpack plugin at build time. It should ride along as a static asset, but **verify the service worker registers and the precache manifest resolves** on the deployed origin — a broken SW silently breaks installability and offline. |
| **Sentry** | `@sentry/nextjs` server-side instrumentation has known friction on Workers. Client-side reporting (already lazy-loaded, P1b) is the part that matters most here; if the server SDK fights the adapter, ship with client-only rather than blocking the deploy. |
| **`src/middleware.ts`** | Supported, and runs on every request. It is 34 kB — keep an eye on Worker startup time. |
| **Node APIs** | `nodejs_compat` is required. If the build complains about an unsupported API, find it before assuming the adapter is at fault. |

**Fallback:** if Cloudflare fights the PWA/image/Sentry combination harder than the launch timeline allows, Vercel deploys this app as-is with Root Directory `apps/web` / `apps/admin` and no code changes. That is a legitimate call to make on the day — not a failure.

## 4. Render — backend

- New **Web Service** from the repo, Root Directory `services/backend` (a `Dockerfile` is present).
- Set a **build filter** on `services/backend/**` so frontend-only commits don't redeploy the API.
- Add all backend env vars, pointed at the production DB.
- **Health check path:** an existing `GET` route.
- Serve it at **`api.vibaar.com`** — the backend CORS allow-list and the frontend `NEXT_PUBLIC_API_BASE_URL` both already assume that hostname.

## 5. Render — production Postgres

- Provision Postgres under the vibaar account; put it in the **same region** as the web service.
- Copy the **internal** connection string into the backend service (internal traffic avoids egress and is faster); keep the external one for `psql` access.
- **Migrations run themselves.** On boot the backend runs GORM AutoMigrate for table structure, then the **B9 versioned runner** applies `services/backend/internal/migration/sql/*.sql` once each, in order, in a transaction, tracked in a `schema_migrations` ledger. A fresh DB comes up correct with no manual step — the old "run 009/010/011/012 by hand" instruction is **obsolete**.
- A failure in the versioned runner **halts boot deliberately** rather than serving on a half-migrated schema. If the service won't start, read the logs before touching the DB.
- **Pre-deploy data check (only matters for a DB that already has users).** Migration 013 adds a unique index guaranteeing one signup bonus per user. It is deliberately **additive** — if duplicates already exist it FAILS and halts boot rather than deleting rows, because those duplicate ledger entries have already been added to `users.shopping_credit`, and removing them silently would break the ledger-equals-balance invariant. Check first:
  ```sql
  SELECT user_id, COUNT(*), SUM(amount)
  FROM credit_entries WHERE type = 'signup_bonus'
  GROUP BY user_id HAVING COUNT(*) > 1;
  ```
  Zero rows (the expected case on a fresh DB) means nothing to do. If it returns rows, reconcile by hand — decide per user whether the excess was already spent, then adjust `users.shopping_credit` to match before removing ledger rows.
- Verify after first boot:
  ```sql
  SELECT version, name, applied_at FROM schema_migrations ORDER BY version;
  ```
- Take a backup snapshot before the first real traffic. **Never commit a dump** — `.gitignore` now blocks the common shapes, but the rule is the point, not the pattern.

## 6. Production env audit — the misconfiguration checklist

Most launch-day failures are here, not in the code.

- **Backend CORS** (`internal/adapter/api/middleware/cors.go`): allow-list is `vibaar.com`, `www.vibaar.com`, `admin.vibaar.com` (+ localhost); production fallback origin is `vibaar.com`. Old Instashop origins are gone and a test asserts they stay gone.
- **Frontend API URL:** `NEXT_PUBLIC_API_BASE_URL=https://api.vibaar.com/api/v1` in **both** Workers — at build time.
- **OAuth redirect URIs:** update Google / Instagram / TikTok consoles to the vibaar domains. A stale redirect URI fails only in production, only at login.
- **Paystack webhook** → `https://api.vibaar.com/...`. Payment confirmation depends on it; test with Paystack's webhook replay before announcing.
- **Shipbubble webhook** → same host. Note that **guest courier orders are deliberately gated off** (guests get self-delivery only) because the courier lifecycle is not guest-aware — see `GetShippingOptions`.
- **WhatsApp webhook:** `WHATSAPP_WEBHOOK_VERIFY_TOKEN` must be set. Outside local the handshake now **fails closed** if it's missing.
- **Transactional providers:** code currently uses Twilio (SMS) + SendGrid (email); the Tinova stack is **Termii** + **Resend** — swap keys/adapters as a follow-up.

## 7. Finish the brand

- **Logo** — drop the asset in `apps/web/public/images/` and update the one reference in `apps/web/src/features/seller-shell/DesktopNav.tsx`, which still points at `/images/instashop_logo_black.svg`. It renders on **every seller dashboard route**, so it is the most visible remaining old-brand artifact.
- **Favicon / OG images** — `apps/web/src/app/favicon.ico` + the manifest icons.
- **Brand colour** — one line: `--brand-rgb` in `apps/web/src/styles/globals.css` (currently `254 44 85` = `#FE2C55`). Admin mirrors it as `brand` in `apps/admin/tailwind.config.js` — change both.
- Confirm the vibaar-default emails/social handles (search `@vibaar.com`, `tiktok.com/@vibaar`).

## 8. Cutover

- End-to-end smoke against production keys: signup → store → product → order → payment → payout.
- Walk **[KYC-PRODUCTION-RUNBOOK.md](./KYC-PRODUCTION-RUNBOOK.md)**.
- Device QA on real Nigerian mobile + 3G: W3.7 type-scale, W4.6 reorg, `@vibaar/ui` visual pass.
- **Archive** the old `Getinstashop-co` repos read-only (they hold the only pre-vibaar git history).

---

## Non-blocking follow-ups

- **B1 — tx-wrap** the payment-confirmation sequence (needs tx-aware repos / DI refactor + tests; the acute double-credit is already closed).
- **M5 — admin adopts the shared packages** (`@vibaar/types`, `api-client`, `ui`). Admin currently has no `@vibaar/*` dependency at all.
- **Guest courier** — lifting the gate means threading `isGuest` through `MarkOrderReady` → `CreateShipment` → `ShipbubbleWebhook` → the wallet ops. A money-path change; give it its own staging QA.
- **Rewards redemption** — accrual works and is idempotent; **redemption is disabled** (`{false && …}` in checkout, `UseCredit` has no call sites) while `/profile/referrals` still displays a balance and promises "₦1,000 instant shopping credit". Either hide the UI or ship a server-authoritative burn path before launch.
