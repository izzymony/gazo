<!-- Preserved planning artefact. Copied from plan mode 2026-09-20. -->

# QA foundation follow-up plan

**Date:** 2026-09-19 · **Status: ACTIVE.**

Phases 0-3 of the QA foundation are complete and merged. **Outstanding:**
the P0 image-upload remediation (backend fix committed in `05c136c`; the
staging Cloudinary credentials, redeploy and data repair are not done, and
`pnpm qa:core` stays red until they are), and the manual launch checks —
Paystack round-trip, webhook delivery and replay idempotency, Shipbubble
rates, a real-device pass, and the KYC privacy review.

**Described:** the repository at `6108c45` on `staging`, responding to the QA
audit. Phase 0 landed as **`db77e8d`**, phase 1 as **`1c5ecb4`** and
**`904df53`**, phase 2 as **`c43b8a9`** and **`2010e4f`**, phase 3 as
**`5d0479c`**. The image-upload remediation it led to is **`05c136c`**.

**Preserved** because plan mode reuses one file path and would otherwise
overwrite this the next time anything is planned — which is exactly how the
original plan was lost.

> **The authoritative operational documents are elsewhere.** This file is a
> preserved planning artefact, not a source of truth. For how QA is actually
> run, use:
> [`vibaar/docs/QA-PLAYBOOK.md`](../../QA-PLAYBOOK.md) ·
> [`vibaar/docs/STAGING-QA-CHECKLIST.md`](../../STAGING-QA-CHECKLIST.md) ·
> [`vibaar/docs/ENV-PREFLIGHT.md`](../../ENV-PREFLIGHT.md) ·
> [`vibaar/docs/DEPLOY.md`](../../DEPLOY.md)

---

# Finish the staging QA foundation

## Context

The QA suite exists and found two real P0s, but an audit showed it is **not yet a release gate**: it can report green while silently skipping every authenticated journey, it runs mutating tests in parallel against one shared account, its login helper depends on an auth landing transition that the rebuilt auth scene can stall, and its staging credentials are committed. This finishes it into something a release decision can rest on.

**The audit is accepted.** I re-verified every code-level claim against HEAD and all of them hold — including the ones about my own work: the silent `test.skip` on missing credentials (`seller.spec.ts:10`, `buyer.spec.ts:54`), `fullyParallel: true` over shared mutable data (`playwright.config.mjs:12`), the committed defaults (`seed-staging.mjs:87-88`), and the fixed `waitForTimeout(3000)` in `admin.spec.ts:18` whose own comment says "give hydration a moment" — precisely the anti-pattern the playbook warns about. The playbook's migration inventory does still stop at 013 while `014_seed_product_taxonomy.sql` exists.

### The product 404 is OPEN — not cleared

An earlier draft of this plan claimed the 404 was a false positive. **That was wrong, and the reasoning was backwards**: it used weaker evidence to dismiss stronger evidence. The observed failure was a Playwright screenshot of the **visibly rendered 404 page** with the Add-to-Cart control absent — browser DOM behaviour. Finding *a* false-positive mechanism does not establish it was *the* mechanism.

Standing classification:

> **An intermittent, currently unreproduced product-loading failure, possibly caused by staging latency. Not a confirmed persistent product defect, and NOT cleared as an HTML-search false positive.**

Investigate: API response timing for `/p/:publicId`, the client loading transition, and specifically **whether a delayed or failed product request incorrectly settles into the 404 branch** rather than an error or retry state. Preserve the trace/screenshot distinction — a screenshot of a rendered 404 is evidence; a regex hit is not.

Separately true and worth keeping as a *method* caution (it is not an explanation of the above): a raw `fetch` of a **valid** product URL does contain "Page not found", because Next's flight payload carries `"notFound":"$undefined"`. In a live browser that node is a single invisible `<script>` and Playwright's `getByText(…).count()` is `0`. So re-investigation must use a rendered DOM, never a raw-HTML regex.

Also verified, so the work below rests on facts rather than the brief's numbers: staging taxonomy is exactly **13 / 52 / 13 linked / 52 with shipping defaults**; the seeded products and `business_id` match the brief; and **direct navigation to `/signin?step=1` puts the full form up in 1.8s**, which is what makes correction #2 viable.

---

## Phase 0 — unblock the gate (separate commit, first)

CI has been red since 17 Sep on `@vibaar/design-tokens`: `TypeError: addBase is not a function`. The preset is fine; the **test's fake Tailwind API is incomplete** — `check-contract.cjs:174` invokes the plugin handler with a stub providing only `addUtilities`, and the auth-scene work added an `addBase` call.

Replace the stub with real Tailwind: `createContext` + `generateRules`, asserting `container-size` actually generates — the technique [`design-drift.mjs`](vibaar/apps/web/scripts/design-drift.mjs) already uses. Already verified: attributable to the preset (bare Tailwind → `false`), fails correctly when the plugin is stripped, full test exits 0, and deep `tailwindcss/lib/lib/*` imports resolve (3.4.19 ships no exports map; CI already passes two `tailwindcss/*` requires in this file).

Touches **only** `packages/design-tokens/scripts/check-contract.cjs`. Push, confirm CI green, then start Phase 1.

## Phase 1 — make the harness trustworthy

1. **Remove the committed credentials entirely** — failing on absence is only half the fix.
   - Delete the committed email / password fallbacks <!-- literals redacted --> (`seed-staging.mjs:87-88`); `qa:seed` **requires** `QA_SELLER_EMAIL` + `QA_SELLER_PASSWORD` and exits with a clear message otherwise.
   - **Stop printing the password.** The script currently echoes `export QA_SELLER_PASSWORD='…'` on success — worse than a committed default, because it lands in CI logs. Print the variable *names* only.
   - Replace the `test.skip` in `seller.spec.ts` / `buyer.spec.ts` with a hard failure in the core project. `qa:smoke` stays credential-free.
   - **Rotate the live staging password** via a one-shot `qa:rotate` (`PUT /users/change-password` exists, so this needs no dashboard work). Its rules:
     - Old **and** new read from **environment variables only** — never command-line arguments, which land in shell history and process listings.
     - **Refuses production** outright.
     - Prints **neither password nor the response body**.
     - Afterwards **verifies the new password logs in** and **verifies the old one no longer does** — a rotation that is not confirmed both ways has not happened.
     - **Manual-only**: never wired into CI, never part of normal seeding.
     - The new value lives only in the GitHub `staging` Environment and local ignored config — never in the repo, never in chat.
2. **Serialize core.** `workers: 1` for the core project only; smoke stays parallel. Core mutates one seller, one cart and one product title.
3. **Deterministic cleanup — serialization alone still pollutes staging.** Repeated runs currently leave a trail: the edit test renames the seeded product and never restores it, so the next `qa:seed` sees the original title missing and creates *another* product (already observed locally — two differently-timestamped "QA Test Tee" rows).
   - Edit test: capture the original title, restore it in `finally`.
   - Cart test: remove the added item in `finally`.
   - **Five-photo test: reuse ONE fixed fixture product rather than creating one per run** (decided, not optional). There is *no* product delete endpoint (only `DELETE /delete-wishlist/:id`), so a per-run product could only be archived via `status`, manufacturing archived rows indefinitely and forcing the count assertion to be weakened to "active only". A reusable fixture keeps the assertion strong. Full fixture rules in Phase 2.8.
   - If any cleanup step fails, report it loudly and print the resource ID for manual cleanup — never swallow it.
4. **Decouple login from the landing CTA.** `signIn` navigates straight to `/signin?step=1`, then waits for `input[name='identifier']`. Add a **separate smoke test** asserting the landing CTA opens the form, so the CTA keeps its coverage — the two concerns stop being one point of failure.
5. **Kill the fixed sleep.** `admin.spec.ts` waits on an outcome — URL reaches auth/login **or** the login form appears — and additionally asserts protected dashboard content never becomes visible. Not a longer sleep.
6. **Audit every wait in the suite.** `domcontentloaded` plus a route-specific locator; no `networkidle`, no bare `load`, no blanket timeout inflation.

## Phase 2 — close the coverage gaps

7. **Taxonomy assertion** — API-only, so it belongs in **smoke** (no credentials): 13 categories, 52 subcategories, 13 external links, 52 with shipping defaults. Numbers confirmed against staging today.
8. **Five-photo upload/save test** — core, serial, under the same concurrency group.

   Named precisely: it uses an existing product and the edit path, so it is an **upload/save** test, **not** a create-product test. It does not exercise initial product creation, which is acceptable because the risk being validated is *image preparation plus Cloudinary upload inside the timeout*. If the fixture is reset to draft and published through the UI, "publish" is fair — the caveat stands either way, and the test name must not overclaim.

   **Fixture rules** (a fixture other tests can corrupt is not a fixture):
   - Dedicated identity — `QA Photo Upload Fixture` — **never** shared with the title-edit or cart tests.
   - Resolved by a **stable marker/`public_id`**, never by title: the title-edit test mutates titles by design.
   - **Reset to a known state before each run** — draft status, one baseline image.
   - Run ID recorded in its **description** (not its identity).
   - If reset fails: **fail loudly, report the fixture ID, and do NOT create another product.**

   Drives the real `input[type=file][multiple]` at [`Step1StartStrong.tsx:201`](vibaar/apps/web/src/features/product-setup/progressive/steps/Step1StartStrong.tsx#L201) with five generated multi-megabyte JPEGs (generated, not committed — the seed script already generates images this way). Asserts the `preparing` state appears and clears (the client preparation of `2a3ce51`), all five images survive the save, the stored product still renders them after reload, records wall-clock time, and **asserts the total QA product count is unchanged**.
9. **Update `QA-PLAYBOOK.md`**: migration inventory → 007, 009–014; note that taxonomy ships via migration 014, not a manual seed. No new strategy document.

## Phase 3 — automation (inert until secrets exist)

10. `.github/workflows/qa-staging.yml`, **`workflow_dispatch` only** so nothing fires before the Environment exists. Uses a `staging` GitHub Environment for `QA_SELLER_*`; a **concurrency group** so overlapping runs queue rather than corrupt the shared account; uploads traces, screenshots and the HTML report on failure — which requires **adding the `html` reporter first**: the config is `reporter: [["list"]]`, so `playwright-report/` is never generated and a workflow uploading it would promise an artifact that does not exist. Upload both `playwright-report/` and `test-results/`. Never seeds or runs core against production; production is read-only smoke behind `QA_ALLOW_PRODUCTION=1`. Schedule and post-deploy triggers are left commented with a one-line note on enabling them — deploys are asynchronous, so push-triggered QA would race Cloudflare and Render.

## Verification

- `pnpm qa:seed` **twice** — second run creates nothing.
- **Smoke 20/20 twice consecutively**; **core green twice consecutively** with **zero credential skips**.
- **`seed → core → seed` leaves account, store and product counts unchanged** — the direct test for run-to-run pollution.
- Each new assertion proven to bite: strip the utility / unset a credential / point at an empty taxonomy and confirm failure, not a pass.
- Investigate staging navigation latency with traces and request timings while the above runs; report as infrastructure, not harness.
- Nothing passes on HTTP status or a shared page title alone; no production mutation possible by default.

## Reporting

Four separate lists, not one: **harness defects fixed**, **confirmed product defects** (with reproduction), **staging infrastructure/performance findings**, **manual launch checks still outstanding** (Paystack round-trip, webhook delivery + replay idempotency, Shipbubble rates, real-device pass, KYC privacy). Report before pushing anything beyond Phase 0.

The **product 404 carries its own verdict line** in that report — reproduced (with the trace), or still open with what was ruled out. It does not get quietly dropped because later runs passed.

Also to report, not fix: the audit's observation that protected admin pages begin data requests before auth resolves — I have not reproduced it yet.

## Out of scope

`CategorySelector.tsx`, `design-sources/auth/`, the Paystack wallet/payout redesign, and any product or auth code a reproduced QA failure has not proven defective. Product fixes do not share a commit with the QA foundation.
