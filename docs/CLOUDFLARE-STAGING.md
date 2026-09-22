# Cloudflare staging deploy — web + admin (OpenNext)

Deploys `apps/web` and `apps/admin` to Cloudflare Workers as **two separate staging
Workers**, via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (not
`next-on-pages` — see [DEPLOY.md §3.1](./DEPLOY.md)).

> **This document is staging only, and staging is permanent** — it keeps
> deploying from the **`staging`** branch after production exists. Production is
> a *separate* pair of Workers, on separate domains, calling a separate API
> backed by a separate database, built from **`main`** with its own config files
> (`wrangler.production.jsonc`) and its own `cf:*:production` scripts. Nothing is
> shared, and no Worker switches environment at runtime.
> **Production commands and build variables live in
> [DEPLOY.md §8](./DEPLOY.md)** — do not adapt the staging values below.

| App | Worker name | Domain | Wrangler config | Backend it calls |
|---|---|---|---|---|
| `apps/web` | `vibaar-web-staging` | `staging.vibaar.com` | `wrangler.jsonc` | `https://api-staging.vibaar.com/api/v1` |
| `apps/admin` | `vibaar-admin-staging` | `admin-staging.vibaar.com` | `wrangler.jsonc` | `https://api-staging.vibaar.com/api/v1` |

Their production counterparts, for contrast:

| App | Worker name | Domain | Wrangler config | Backend it calls |
|---|---|---|---|---|
| `apps/web` | `vibaar-web` | `vibaar.com`, `www.vibaar.com` | `wrangler.production.jsonc` | `https://api.vibaar.com/api/v1` |
| `apps/admin` | `vibaar-admin` | `admin.vibaar.com` | `wrangler.production.jsonc` | `https://api.vibaar.com/api/v1` |

Staging backend is already live: `https://api-staging.vibaar.com/api/v1/healthcheck`.

---

## 1. What YOU must create in Cloudflare (I can't — no account access)

### 1.1 Zone
`vibaar.com` must be a **zone on this Cloudflare account** (nameservers pointed at
Cloudflare). Custom Worker domains can only be attached to a zone Cloudflare manages.

### 1.2 API token (for CLI deploy)
Create a token at **My Profile → API Tokens → Create Token**. Start from the
**"Edit Cloudflare Workers"** template, then confirm/add these permissions:

| Scope | Permission | Why |
|---|---|---|
| Account → Workers Scripts | **Edit** | upload the Worker + assets |
| Account → Workers R2 Storage | Edit | only if an R2 cache is added later (optional now) |
| Zone → Workers Routes | **Edit** | attach `*.vibaar.com` custom domains |
| Zone → DNS | **Edit** | custom-domain DNS records |
| Zone → Zone | Read | resolve the zone |
| Account → Account Settings | Read | resolve the account |
| User → User Details | Read | token identity |

Set **Zone Resources → Include → Specific zone → `vibaar.com`**. Then hand the token
to the deploy environment as `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`) —
a shell env var or CI secret, **never pasted into chat or committed**.

> Alternative: skip the token and run `pnpm dlx wrangler login` (interactive OAuth)
> on the machine doing the deploy. Fine for a one-off manual staging deploy.

### 1.3 DNS
Attaching a custom domain to a Worker in the dashboard (Workers → the Worker →
Settings → Domains & Routes → Add → Custom Domain) **creates the DNS record for you**.
So you do **not** hand-create `staging.vibaar.com` / `admin-staging.vibaar.com` — add
them as Worker custom domains and Cloudflare provisions the proxied record + cert.

---

## 2. Deploy (once the token/zone exist)

Two ways — pick one.

**A. Cloudflare dashboard "Workers Builds" (git-connected, recommended for staging).**
Connect the `Tinovalabs/vibaar` repo, one Worker per app:
- Root directory: `apps/web` (then `apps/admin`)
- Build command: `pnpm cf:build`
- Deploy command: `pnpm cf:deploy` (or let Workers Builds run `wrangler deploy`)
- Set the **Build environment variables** from §3 (they inline at build time).
- Requires `main` to be pushed (the OpenNext config is committed; see push note at the end).

**B. Manual CLI from a clone** (needs the token or `wrangler login`):
```bash
# on the `staging` branch; env vars from §3 exported (present AT BUILD time):
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… pnpm -C apps/web cf:deploy
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… pnpm -C apps/admin cf:deploy
```
These are the **staging** scripts and they use `wrangler.jsonc`. The production
pair is `cf:deploy:production` on `main` — see [DEPLOY.md §8.2](./DEPLOY.md).
Then attach the custom domains in the dashboard (§1.3).

---

## 3. Staging build environment variables

> Staging values. The production set is [DEPLOY.md §8.3](./DEPLOY.md).

`NEXT_PUBLIC_*` are **inlined at build time** — they must be set when the build runs
(dashboard Build vars for method A, or exported before `cf:deploy` for method B), not
as runtime Worker vars. All are non-secret public config. **No secret keys here.**

### `apps/web` (vibaar-web-staging)
```
NEXT_PUBLIC_API_BASE_URL=https://api-staging.vibaar.com/api/v1
NEXT_PUBLIC_CALLBACKENDPOINT=https://staging.vibaar.com
NEXT_PUBLIC_ORDER_ON_SUCCESS=true
NEXT_PUBLIC_PAYSTACK_KEY=<Paystack TEST public key, pk_test_… — needed for payment QA>
NEXT_PUBLIC_ENVIRONMENT=staging     # NOTE: web code does not read this today (no-op; harmless)
```

### `apps/admin` (vibaar-admin-staging)
```
# NOTE the two different forms — this is not a typo, and setting both to the
# versioned value is what broke admin login (it produced /api/v1/api/v1).
NEXT_PUBLIC_API_URL=https://api-staging.vibaar.com           # bare origin; config.ts appends /api/v1
NEXT_PUBLIC_API_BASE_URL=https://api-staging.vibaar.com/api/v1   # versioned; api-client.ts uses as-is
NEXT_PUBLIC_ADMIN_API_URL=https://api-staging.vibaar.com/api/v1/admin   # not read by any source file — dead config
NEXT_PUBLIC_ADMIN_PORTAL_URL=https://admin-staging.vibaar.com
NEXT_PUBLIC_MAIN_PLATFORM_URL=https://staging.vibaar.com
NEXT_PUBLIC_ENVIRONMENT=staging
```

> **Secrets stay out of the frontend.** Paystack SECRET key, Cloudinary URL, BVN key,
> DB creds — backend only (Render). The frontend only ever gets `pk_test_…` (a
> publishable key by design) and public URLs.

---

## 4. Verify after deploy
- `https://staging.vibaar.com` renders
- `https://staging.vibaar.com/shop` renders the marketplace feed
- `https://admin-staging.vibaar.com` loads (admin login — not "Network error")
- DevTools → Network: frontend XHR/fetch calls hit `api-staging.vibaar.com`
- (web) DevTools → Application → Service Workers: `sw.js` registered
- (web) product images load

---

## 5. Known compatibility items (this app on Workers) — verified locally

| Area | Status / handling |
|---|---|
| **next/image** (28 files, default optimizer) | Handled — `images.unoptimized` is enabled for the CF build only (`CF_BUILD=1` in `next.config.mjs`); Vercel/other builds keep optimization. For a production CF launch, revisit (Cloudflare Images / loader) so 3G users aren't served full-size images. |
| **next-pwa** (web only) | ✅ **Works** — the OpenNext build ships `sw.js` + `workbox-*.js` + the precache manifest as static assets. Confirm registration on the deployed origin (§4). |
| **Sentry server SDK** | Handled — `withSentryConfig` is **skipped for the CF build** (`CF_BUILD=1`); its server auto-instrumentation broke the Workers bundler. Client-side reporting is lazy-loaded (P1b) and unaffected. |
| **middleware.ts** (web) | Builds; runs every request on Workers. |
| **pnpm-monorepo root detection** | ✅ Resolved — a stray `apps/web/package-lock.json` was making both Next's tracing and OpenNext detect `apps/web` as the monorepo root. Deleting it fixed everything; no `outputFileTracingRoot` or linker change needed. See §6. |

---

## 6. Local build verification (2026-08-30)

**Both apps build clean under OpenNext** with the normal pnpm (isolated) linker — `resolve-errors: 0`, valid worker + assets, "OpenNext build complete":
- **`apps/web`** → ✅ `pnpm -C apps/web cf:build`, exit 0, **~57 MB** `.open-next`.
- **`apps/admin`** → ✅ `pnpm -C apps/admin cf:build`, exit 0, **~52 MB** `.open-next`.

### Root cause (and the one-line fix)
Web initially failed with 51 esbuild "Could not resolve" errors, and — with a tracing-root workaround — an `ENOENT pages-manifest.json`. Both symptoms traced to a **single stray `apps/web/package-lock.json`** committed into a pnpm workspace:
- OpenNext's `findPackagerAndRoot` walks up from the app looking for a lockfile and returns the first hit. It found `apps/web/package-lock.json` *before* the root `pnpm-lock.yaml` → decided the monorepo root was `apps/web`, packager `npm` → empty `packagePath` → wrong manifest path.
- Next's own `@vercel/nft` tracing inferred the same wrong workspace root → copied an **incomplete** Next server (5 of 139 `dist/server` files) into the standalone → the 51 resolve errors.

**Fix: delete `apps/web/package-lock.json`.** No `outputFileTracingRoot`, no `node-linker=hoisted`, no OpenNext version change — those were workarounds for the mis-detected root. The repo keeps its deliberate pnpm-isolated linker (`.npmrc`). Both apps are now **deployable** once the CF account/token/DNS exist.
