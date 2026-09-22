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

### 3.2 Setup, per app — already committed

The dependencies, configs and scripts exist; nothing here needs creating. **Four
Workers, four configs, four scripts** — one config per Worker, never one config
that switches on an env var.

| App | Environment | Wrangler config | Build | Deploy |
|---|---|---|---|---|
| `apps/web` | staging | `wrangler.jsonc` | `pnpm -C apps/web cf:build` | `pnpm -C apps/web cf:deploy` |
| `apps/web` | **production** | `wrangler.production.jsonc` | `pnpm -C apps/web cf:build:production` | `pnpm -C apps/web cf:deploy:production` |
| `apps/admin` | staging | `wrangler.jsonc` | `pnpm -C apps/admin cf:build` | `pnpm -C apps/admin cf:deploy` |
| `apps/admin` | **production** | `wrangler.production.jsonc` | `pnpm -C apps/admin cf:build:production` | `pnpm -C apps/admin cf:deploy:production` |

The `:production` scripts pass `--config wrangler.production.jsonc` to **both**
the OpenNext build and the deploy. Passing it to only one of them deploys the
production Worker from a staging-configured build, which is the mistake the
paired scripts exist to prevent.

`NEXT_PUBLIC_*` values are inlined **at build time**, so they must be present
when the build runs, not only at runtime — see §8.3. Runtime secrets go in the
Cloudflare dashboard (Workers → Settings → Variables) or via
`wrangler secret put`; the frontends need none today.

Custom domains are attached per Worker and Cloudflare provisions the DNS record
and cert: `vibaar.com` + `www.vibaar.com` → `vibaar-web`; `admin.vibaar.com` →
`vibaar-admin`. Both are already declared in the production configs' `routes`.

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
- **Frontend API URL:** `NEXT_PUBLIC_API_BASE_URL=https://api.vibaar.com/api/v1`
  in **both** Workers — at build time, and it **must** include `/api/v1`.
  The admin Worker also needs `NEXT_PUBLIC_API_URL=https://api.vibaar.com` —
  the **bare origin**, because `apps/admin/src/lib/config.ts` appends `/api/v1`
  itself. The two vars take different forms; setting both to the versioned
  value produces `/api/v1/api/v1` and 404s admin login. See
  `docs/ENV-PREFLIGHT.md` §9.
- **OAuth redirect URIs:** update Google / Instagram / TikTok consoles to the vibaar domains. A stale redirect URI fails only in production, only at login.
- **Paystack webhook** → `https://api.vibaar.com/...`. Payment confirmation depends on it; test with Paystack's webhook replay before announcing.
- **Shipbubble webhook** → same host. Note that **guest courier orders are deliberately gated off** (guests get self-delivery only) because the courier lifecycle is not guest-aware — see `GetShippingOptions`.
- **Shipbubble API base** must be `https://api.shipbubble.com/v1`. It is the
  default when `SHIPBUBBLE_API_URL` is unset, and the startup guard **refuses
  `app.shipbubble.com` by name** — that is the dashboard host, and staging was
  set to it, which made every address validation return an HTML 404 and every
  seller look like they had no delivery option. The webhook secret is the same
  API key, selected by the same rule.
- **Shipbubble key, per environment, with no fallback:** production reads only
  `SHIPBUBBLE_API_KEY_PROD`; staging, development and local read only
  `SHIPBUBBLE_API_KEY_STAGING`. A key carrying the other environment's prefix
  (`sb_prod_` / `sb_sandbox_`) is refused at boot. **Setting only the production
  key on a staging service now fails startup instead of quietly booking real
  couriers against the live account.**
- **WhatsApp webhook:** `WHATSAPP_WEBHOOK_VERIFY_TOKEN` must be set. Outside local the handshake now **fails closed** if it's missing.
- **Transactional providers:** code currently uses Twilio (SMS) + SendGrid (email); the Tinova stack is **Termii** + **Resend** — swap keys/adapters as a follow-up.

## 7. Finish the brand

- **Logo** — drop the asset in `apps/web/public/images/` and update the one reference in `apps/web/src/features/seller-shell/DesktopNav.tsx`, which still points at `/images/instashop_logo_black.svg`. It renders on **every seller dashboard route**, so it is the most visible remaining old-brand artifact.
- **Favicon / OG images** — `apps/web/src/app/favicon.ico` + the manifest icons.
- **Brand colour** — one line: `--brand-rgb` in `apps/web/src/styles/globals.css` (currently `254 44 85` = `#FE2C55`). Admin mirrors it as `brand` in `apps/admin/tailwind.config.js` — change both.
- Confirm the vibaar-default emails/social handles (search `@vibaar.com`, `tiktok.com/@vibaar`).

## 8. Cutover

### 8.1 Two permanent environments, two branches

**Staging is permanent.** It is not a pre-launch scaffold to be torn down at
cutover — it stays, and it keeps deploying from **`staging`** after production
exists. Production deploys from **`main`**, and `main` moves only by merging
`staging` after a QA pass; nothing is pushed straight to it.

**Nothing is shared between them.** Not the Workers, not the API, not the
database, not the domains, not the secrets, not the provider credentials. There
is no environment switch anywhere in the code or config — each environment is
its own set of resources, so a staging deploy cannot reach production data and a
production key cannot leak into a staging build.

| | Staging (branch `staging`) | Production (branch `main`) |
|---|---|---|
| Web Worker | `vibaar-web-staging` | `vibaar-web` |
| Admin Worker | `vibaar-admin-staging` | `vibaar-admin` |
| Web domain | `staging.vibaar.com` | `vibaar.com`, `www.vibaar.com` |
| Admin domain | `admin-staging.vibaar.com` | `admin.vibaar.com` |
| API | `api-staging.vibaar.com` | `api.vibaar.com` |
| Render service | `vibaar-api-staging` | a **separate** production Web Service |
| Database | `vibaar-staging-db` | a **separate** production Postgres |
| Paystack | test keys (`pk_test_…` / `sk_test_…`) | **live** keys |
| Shipbubble | `SHIPBUBBLE_API_KEY_STAGING` only | `SHIPBUBBLE_API_KEY_PROD` only |
| Backend secrets | staging `.env` on the staging service | separate values on the production service |

The Shipbubble row is enforced at boot, not by convention: production reads only
the prod key, staging/development/local read only the staging key, and a key
carrying the other environment's prefix is refused at startup (§6). The two
databases are separate instances — **production starts empty**, so no staging
row ever appears in it.

**Rollback point:** tag `pre-staging-cutover-2026-09-15` marks `2ecdb6d`, the
commit every environment was serving immediately before the branch cutover.

### 8.2 Production deploy commands

Backend (Render) redeploys itself from `main` once the production service is
created with Root Directory `services/backend` and a build filter on
`services/backend/**` (§4). There is no CLI deploy step: **merging to `main` is
the deploy.** To force one without a new commit, use the Render dashboard's
*Manual Deploy → Deploy latest commit*, or:

```bash
render deploys create <PRODUCTION_SERVICE_ID> --confirm -o json
```

Frontends (Cloudflare) are deployed explicitly, from a clone on `main`, with the
production build variables exported — they inline at build time:

```bash
git checkout main && git pull            # production builds from main, never staging

# web → vibaar-web (vibaar.com, www.vibaar.com)
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
NEXT_PUBLIC_API_BASE_URL=https://api.vibaar.com/api/v1 \
NEXT_PUBLIC_CALLBACKENDPOINT=https://vibaar.com \
NEXT_PUBLIC_ORDER_ON_SUCCESS=true \
  pnpm -C apps/web cf:deploy:production

# admin → vibaar-admin (admin.vibaar.com)
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
NEXT_PUBLIC_API_URL=https://api.vibaar.com \
NEXT_PUBLIC_API_BASE_URL=https://api.vibaar.com/api/v1 \
NEXT_PUBLIC_ENVIRONMENT=production \
  pnpm -C apps/admin cf:deploy:production
```

Use `cf:build:production` alone to produce the bundle without deploying — worth
doing once before the first real deploy, since it fails on configuration
problems without touching the live Worker.

**A Cloudflare deploy has silently not happened twice in this project.** After
each one, confirm the bundle actually carries the new code before believing it:
the QA suite's *"the built bundle points at the configured API host"* check is
the cheapest version of that.

### 8.3 Production `NEXT_PUBLIC_*` build variables

Inlined at build time, so they must be set when the build runs. All are
non-secret public config — **no secret key belongs here**. This list is what the
source actually reads, verified by grepping `apps/*/src`; the "not read" notes
are there because the staging doc has carried dead entries that people kept
setting.

**`apps/web` → `vibaar-web`**
```
NEXT_PUBLIC_API_BASE_URL=https://api.vibaar.com/api/v1   # MUST include /api/v1
NEXT_PUBLIC_CALLBACKENDPOINT=https://vibaar.com          # payment return URL
NEXT_PUBLIC_ORDER_ON_SUCCESS=true
NEXT_PUBLIC_SENTRY_DSN=<production Sentry DSN>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<production Maps key, restricted to vibaar.com>
NEXT_PUBLIC_GOOGLE_API_KEY=<production Google key>
NEXT_PUBLIC_GA_MEASUREMENT_ID=<production GA id>
```
Not read by `apps/web/src`, despite appearing in the staging list:
`NEXT_PUBLIC_PAYSTACK_KEY` (checkout redirects to Paystack's
`authorization_url`, so no publishable key reaches the browser) and
`NEXT_PUBLIC_ENVIRONMENT`.

**`apps/admin` → `vibaar-admin`**
```
NEXT_PUBLIC_API_URL=https://api.vibaar.com               # BARE origin; config.ts appends /api/v1
NEXT_PUBLIC_API_BASE_URL=https://api.vibaar.com/api/v1   # versioned; api-client.ts uses as-is
NEXT_PUBLIC_ENVIRONMENT=production                       # Sentry environment tag
NEXT_PUBLIC_SENTRY_DSN=<production Sentry DSN>
```
The two API vars take **different forms on purpose**. Setting both to the
versioned value produces `/api/v1/api/v1` and 404s admin login — it has happened
once already. Not read by `apps/admin/src`: `NEXT_PUBLIC_ADMIN_API_URL`,
`NEXT_PUBLIC_ADMIN_PORTAL_URL`, `NEXT_PUBLIC_MAIN_PLATFORM_URL`.

Staging's equivalents are in
**[CLOUDFLARE-STAGING.md §3](./CLOUDFLARE-STAGING.md)** and are unchanged.

Release order, in full, is in **[QA-PLAYBOOK.md](./QA-PLAYBOOK.md)**. The short
version: CI green on `staging` → staging deploys → verify `schema_migrations` →
seed → `pnpm qa:staging` → manual pass → go/no-go → merge to `main` → production
deploy → `QA_ALLOW_PRODUCTION=1 pnpm qa:smoke`.

### 8.4 Checks

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
