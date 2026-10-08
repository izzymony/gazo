# QA playbook — vibaar

How a change gets from `staging` to production without shipping something
embarrassing. Small enough to actually maintain: automate the repeatable paths,
keep people for the things automation is bad at.

Companion documents:
- [STAGING-QA-CHECKLIST.md](./STAGING-QA-CHECKLIST.md) — the manual pass
- [ENV-PREFLIGHT.md](./ENV-PREFLIGHT.md) — every env var, and the **go/no-go gate**
- [DEPLOY.md](./DEPLOY.md) — deploy mechanics and the staging→main cutover

---

## 1. Release flow

```
1.  Code lands on staging
2.  CI passes                       (GitHub Actions, on push to staging and main)
3.  Staging deploys                 (Render backend + Cloudflare Workers, from staging)
4.  Verify schema_migrations        ← see §2, do NOT run migrations by hand
5.  Seed / refresh test data        pnpm qa:seed
6.  Automated QA                    pnpm qa:staging
7.  Manual QA pass                  STAGING-QA-CHECKLIST.md
8.  Fix / retest loop
9.  Go / no-go                      ENV-PREFLIGHT.md → "Go/no-go gate"
10. Merge staging → main
11. Production deploy
12. Production smoke                QA_WEB_URL=… QA_ALLOW_PRODUCTION=1 pnpm qa:smoke
```

`main` is production-only. Nothing is ever pushed straight to it.

## 2. Migrations verify, they do not get run

The backend applies migrations **itself** on boot: GORM AutoMigrate for table
structure, then the B9 versioned runner (`internal/migration/versioned.go`)
applies each `internal/migration/sql/*.sql` once, in order, in a transaction,
recorded in a **`schema_migrations`** ledger. `main.go` calls `migration.Migrate()`
at startup.

So step 4 is a **check**, not an action. After a backend deploy:

```sql
SELECT version, name FROM schema_migrations ORDER BY version;
```

Expect every file in `services/backend/internal/migration/sql/` to be listed —
currently **007, 009, 010, 011, 012, 013, 014**. A missing row means the runner
failed and the deploy logs will say why; applying it by hand hides the failure
instead of fixing it.

**014 seeds the product taxonomy** (13 categories, 52 subcategories, their
Shipbubble links and shipping defaults). It is a migration, not a manual seed —
`pnpm qa:seed` deliberately refuses to invent categories, because an empty
taxonomy means 014 did not run. The `Taxonomy` smoke test asserts all four
numbers, so this is checked on every run rather than only when someone looks.

> Any instruction to "run 009/010/011 by hand" is obsolete. It predates the
> versioned runner and should be deleted wherever it is still written down.

## 3. What is automated

`pnpm qa:staging` (Playwright, `tests/qa/`). Points at staging by default; every
target is overridable so the same suite serves the production smoke.

**Smoke** — runs anywhere, needs no credentials:
- web, admin and auth pages render their own content
- an unknown route renders not-found *(the control — see §5)*
- the built bundle points at the configured API host
- API healthcheck and products endpoint respond
- CORS allows the web origin and refuses an unknown one
- Paystack and Shipbubble webhooks reject unsigned calls
- the landing CTA opens the sign-in form *(covered separately from login — see §5)*
- the taxonomy is complete and linked: 13 / 52 / 13 / 52

**Core** — needs a seeded environment and `QA_SELLER_*`. **Missing credentials
FAIL the run, they do not skip**: a skipped core run reports green having
exercised no authenticated journey at all. Core also runs on a single worker,
because its tests use one shared seller, browser cart and product (and restore
the seller's storefront appearance after the theme check):
- seller signs in and reaches the dashboard
- **a product edit survives a reload**
- the seller's storefront renders products; Deals and Reviews tabs switch to
  their own controls; unknown store handles and product ids render not-found
- a product page renders purchase controls and its quantity stepper works
- an empty cart renders its empty state; adding a product updates its quantity
  and total, and removing the last item returns to empty
- proceeding to checkout opens either the shipping-profile or order-review
  step; the test stops before saving an address, placing an order, or paying
- product links on `/shop` carry a public id, and an unknown-vendor search
  reaches the feed's no-results state when the staging feed responds successfully
- latest staging retry timed out with the feed showing "Couldn't load vendors";
  this search journey is still unverified and must not be counted as passed
- the seller can update the storefront background color; the original theme is
  restored and verified against the API in cleanup
- account and address lifecycle tests are opt-in: signup permanently creates a
  user; shipping creates a temporary address, obtains a live quote, selects a
  delivery option, and deletes the address in cleanup

`core-mobile` runs the buyer cart and storefront specs on a Pixel 5 viewport.
Run it with `pnpm exec playwright test --config=tests/qa/playwright.config.mjs --project=core-mobile`;
it uses the same staging seller credentials and seeded catalog as desktop core.

The store-creation journey runs only when the configured seller has no store,
and then requires `QA_ALLOW_STORE_CREATION=1` because the created store cannot
be deleted by the API. Live signup and shipping journeys require explicit,
flow-specific opt-ins. Signup follows the currently deployed UI. Password
recovery is not automated; keep its verification step and password change in
manual QA. Shipping requires valid contact/address data; its profile is deleted
in `finally`, while the delivery quote is a real Shipbubble/provider request.
Do not use shared personal accounts or addresses.

Run it:

```bash
pnpm qa:seed                     # idempotent; safe to re-run before every pass
export QA_SELLER_EMAIL=… QA_SELLER_PASSWORD=…
pnpm qa:staging                  # everything
pnpm qa:smoke                    # smoke only, no credentials needed
```

The live account/shipping tests are in `tests/qa/core/account-shipping-live.spec.ts`
and are skipped unless their individual write gate is set:

- Signup: `QA_ALLOW_SIGNUP=1` plus `QA_SIGNUP_EMAIL`, `QA_SIGNUP_PHONE`,
  `QA_SIGNUP_PASSWORD`, `QA_SIGNUP_FULL_NAME`, and `QA_SIGNUP_USERNAME`.
  Use a unique, unused identity; accounts cannot be removed. Automated coverage
  does not assert or enter an OTP.
- Password recovery has no automated coverage; exercise the complete verified
  reset manually using a dedicated QA account.
- Shipping and delivery: `QA_ALLOW_SHIPPING_PROFILE=1` plus
  `QA_SHIPPING_FULL_NAME`, `QA_SHIPPING_PHONE`, `QA_SHIPPING_EMAIL`, and
  `QA_SHIPPING_ADDRESS`. Supply an address accepted by the configured delivery
  provider. Profile deletion is attempted in `finally`; confirm cleanup in the
  API if the run is interrupted.

All secret/contact values should be provided through the environment, not
command-line arguments or committed files. Do not set these gates in routine
CI. The shipping test performs live Shipbubble/quote calls but stops before
order creation and payment.

Point it elsewhere with `QA_WEB_URL`, `QA_ADMIN_URL`, `QA_API_URL`. Production
targets are **refused** unless `QA_ALLOW_PRODUCTION=1`, and even then only the
smoke project should be run there — core and the seeder create data.

Secrets are read from the environment, never passed as arguments.

## 4. What stays manual

Automation is bad at judgement, feel, and third-party dashboards. See
[STAGING-QA-CHECKLIST.md](./STAGING-QA-CHECKLIST.md). Payment specifically:
**order placement, the Paystack redirect, the webhook, and the order-status
transition remain manual for launch.** The automated shipping journey stops at
the review page before `Pay Now`, so it creates no order or payment session. A
card round-trip is the flakiest thing to automate and a webhook cannot be awaited
deterministically from a browser. The automated suite covers the security half —
that both webhooks reject unsigned calls.

## 5. Two traps, learned the hard way

**Never assert on `response.ok()`.** The deployed app answers **HTTP 200 for
every unknown path** and renders a client-side "Page not found", and *every page
shares one `<title>`*. A suite built on status codes or titles passes for routes
that do not exist. Assert on route-specific **content**. The "unknown route
renders not-found" test exists to keep the others honest.

**A fixed sleep asserts on the clock, not the application.** The admin gate test
slept exactly 3s; under Cloudflare latency the redirect was still ~11s away, so
it reported the gate broken when it was merely slow. Wait for the OUTCOME. The
answer is never a longer sleep.

**Never `waitUntil: "load"`.** It waits for every image and font on the page —
it blew a 45s budget on the dashboard edit route. Use `gotoRoute()`:
`domcontentloaded` plus a route-specific locator.

**Clean up what you mutate, in `finally`.** The edit test once renamed a seeded
product and never restored it, destroying `QA Test Cap`'s identity on staging
and leaving the next seed to create a duplicate. Restore the original, and let
a failed cleanup report the resource id loudly.

**Markers must not span an inline `<br>`.** The homepage `<h1>` is
`Turn your attention<br>into income.`, whose `textContent` reads
`"attentioninto"` with no space. Playwright matches `textContent`. Keep each
marker inside one text node.

## 6. Severity

| | Meaning |
|---|---|
| **P0** | Blocks payment, order, login, shipping, data/privacy, or launch |
| **P1** | Major workflow broken, workaround exists |
| **P2** | Visible bug or confusing UX |
| **P3** | Polish |

## 7. Environments

| | staging | production |
|---|---|---|
| branch | `staging` | `main` |
| web | staging.vibaar.com | vibaar.com |
| admin | admin-staging.vibaar.com | admin.vibaar.com |
| api | api-staging.vibaar.com | api.vibaar.com |
| provider keys | test | live |
| data | seeded test catalog | no test data |

Provider keys and `NEXT_PUBLIC_*` live **only** in the Render and Cloudflare
dashboards, never in the repo. `NEXT_PUBLIC_*` are inlined at **build** time, so
changing one needs a rebuild, not a restart — and setting one as a *runtime*
variable has no effect at all.
