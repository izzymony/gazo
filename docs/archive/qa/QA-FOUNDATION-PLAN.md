<!-- Preserved planning artefact. Recovered 2026-09-20. -->

# QA foundation plan (original)

**Date:** 2026-09-15 · **Status: COMPLETED — superseded by the follow-up plan.**

**Described:** the repository at `2ecdb6d`..`8d9e095` on `feat/brand-identity`,
before the staging cutover. It planned the first QA suite, the API-based seeder
and the QA documents. Implemented in commit **`aa209c0`**, with the two P0s it
uncovered fixed in **`a0698bb`**.

**Recovered** from this session's transcript after the plan-mode file was
overwritten by the follow-up plan; plan mode reuses a single path. Plan text
only — no transcript metadata, environment values or credentials. One literal
test password was redacted; the finding it illustrates is unchanged.

> **The authoritative operational documents are elsewhere.** This file is a
> preserved planning artefact, not a source of truth. For how QA is actually
> run, use:
> [`vibaar/docs/QA-PLAYBOOK.md`](../../QA-PLAYBOOK.md) ·
> [`vibaar/docs/STAGING-QA-CHECKLIST.md`](../../STAGING-QA-CHECKLIST.md) ·
> [`vibaar/docs/ENV-PREFLIGHT.md`](../../ENV-PREFLIGHT.md) ·
> [`vibaar/docs/DEPLOY.md`](../../DEPLOY.md)

---

# QA foundation for Vibaar

## Context

Staging now runs from its own branch with CI green, but there is no repeatable way to answer "is this safe to ship?" — every check so far has been ad hoc. The proposed hybrid playbook (automate the repeatable paths, keep humans for trust/feel/dashboards) is the right shape and is adopted as written. The release flow ordering is right too, in particular seeding *after* deploy and *before* E2E.

The go/no-go list is notably well aimed: "staging frontend calls localhost" and "provider secrets appear in logs" were both **real defects found in this codebase today** — the Workers build baked `http://localhost:8088/api/v1`, and `NewShipbubbleService` printed its API key in full on every boot. A list that catches the bugs you actually have is worth keeping.

Four things the investigation changed:

1. **Seeding cannot work as specified.** `SeedRealisticData()` is hard-blocked outside local/dev *by design* — it creates logins, so the guard stays. The seed must therefore go through the **public API**, not the DB seeder. That is better anyway: it exercises the real endpoints and works against any environment from a base URL.
2. **`./backend seed` plants a known-credential account in any environment.** `SeedData()` creates `sam.show@example.com` with a committed password with **no environment guard**, and `ENV-PREFLIGHT.md` documents `./backend seed` as the *production* admin-bootstrap step. It is also the only thing that seeds categories, which staging needs before any product can exist. This is a P0 against two items on the go/no-go list (login, data/privacy).
3. **Cypress is already a declared E2E framework** — `apps/admin` carries `cypress ^13.14.2` plus `test:e2e` scripts, but no `cypress/` directory was ever scaffolded. Adding Playwright without removing it leaves two declared frameworks (circuit-breaker rule #1).
4. **Three new docs is one too many.** `ENV-PREFLIGHT.md` is already a complete launch tick-list with a boot-guard section, and `DEPLOY.md` already has §6 "Production env audit — the misconfiguration checklist" and §8 "Cutover". A third launch doc will disagree with them inside a week.

Also missing from the release flow: **a DB migration step**. Migrations 009–011 are owner-run and their staging status is still unverified; a flow without that step will bite at production cutover.

## The build

**1. Guard the seeder's test user** — `services/backend/internal/seeder/seeder.go`
Wrap only the `sam.show@example.com` block in the same local-only check `realistic_seeder.go` already uses (reuse `isLocalSeedEnv()`, don't write a second one). Category, notification-template and admin-bootstrap seeding must keep running anywhere — that is what staging and production legitimately need. Go regression test: `SeedData` with `APP_ENV=staging` creates categories and **no** `sam.show` user. Then note in `ENV-PREFLIGHT.md` that `./backend seed` is now safe to run in production.

**2. Seed staging through the API** — `scripts/qa/seed-staging.mjs`
Idempotent, takes `--base-url`, creates one seller, one store, 2–3 products with images:
`POST /api/v1/register` → `POST /api/v1/login` → `POST /api/v1/business` → `POST /api/v1/products` (routes confirmed in `internal/adapter/api/routes/{auth,business,product}.go`). Re-running must not duplicate — look up by handle/email first. Categories come from step 1's seeder, which must run before this.

**3. Playwright** — `tests/e2e/`, plus **delete the unused `cypress` dep and `test:e2e` scripts** from `apps/admin/package.json`.

*Smoke (no secrets, runs anywhere):* web/admin/auth pages load · dashboard redirects when logged out · API healthcheck · `GET /api/v1/products` responds · CORS **allows** the staging origins and **refuses** an unknown one · both webhooks reject unsigned calls (401, needs no secret) · **the frontend calls `api-staging.vibaar.com`, not localhost** — assert against the served bundle, which is how today's broken deploy was caught.

*Core E2E:* seller login → create product → **edit it and confirm the value persists after reload** (the exact bug class that started this) → buyer views it → adds to cart → reaches checkout entry.

> **Trap that will otherwise produce a green-but-worthless suite:** the deployed app returns **HTTP 200 for every unknown route** (`/asdfghjkl` renders the same shell as `/`). Status-code assertions pass for pages that do not exist. **Every navigation assertion must assert on content**, never `response.ok()`.

Payment redirect and webhook→order-status stay **manual** for launch, per decision. The unsigned-rejection smoke above still covers the security half and needs no secret.

**4. Docs** — two new, two extended:
- `docs/QA-PLAYBOOK.md` — the process: release flow (with the **migration step added**), severity ladder, what is automated vs manual, how to run everything.
- `docs/STAGING-QA-CHECKLIST.md` — the manual pass: mobile Safari/Chrome feel, checkout trust, image upload, KYC upload/download, admin review usability, Paystack and Shipbubble dashboard confirmation.
- **Extend** `ENV-PREFLIGHT.md` with the go/no-go gate rather than creating `PRODUCTION-GO-NOGO.md`; **extend** `DEPLOY.md` §8 with the staging→main cutover and the `pre-staging-cutover-2026-09-15` rollback tag.

**5. `pnpm qa:staging`** — root `package.json` (which currently has only turbo passthroughs).
Takes a **base URL**, defaulting to staging, so the same command serves the post-production-deploy smoke in step 12 of the release flow. Secrets come from the local env, never arguments. Shaped so a GitHub Actions job can wrap it later with no changes.

## Verification

1. `pnpm -C services/backend test` — new seeder regression fails before the guard, passes after.
2. `APP_ENV=staging ./backend seed` against a local DB: categories present, `sam.show` **absent**; then `APP_ENV=local`: user present.
3. `node scripts/qa/seed-staging.mjs --base-url=https://api-staging.vibaar.com` — run **twice**; second run adds nothing.
4. `pnpm qa:staging` green against staging. Then prove the suite bites: point it at a URL with no API and confirm the API-base-URL and CORS checks **fail** rather than pass silently.
5. Confirm `/api/v1/products` is no longer `total: 0`, and the seeded store renders at its `/@handle`.
6. CI stays green; `pnpm lint` and `type-check` clean.

Out of scope: payment/webhook E2E automation, a GitHub Actions QA job, the soft-404 fix (filed, not fixed), and any Cloudflare/provider dashboard change.
