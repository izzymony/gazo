# vibaar — Deploy Guide (M4)

Turnkey steps to take the local `vibaar` monorepo live under the new brand. Everything below is the **owner-gated** path; the code side (M1–M3 + rebrand + CI) is done and green.

Repo layout: `apps/web` (Next), `apps/admin` (Next), `services/backend` (Go). pnpm + turbo. CI at `.github/workflows/ci.yml` runs on push.

---

## 1. New GitHub org + push

```bash
# create the org + an EMPTY repo (no README/license) at github.com, e.g. "vibaar/vibaar"
cd "…/myInstaShop/vibaar"
git remote add origin git@github.com:<ORG>/<REPO>.git
git push -u origin main
```
CI (`ci.yml`) runs automatically on push: **js** job (`pnpm install --frozen-lockfile` + `pnpm type-check` + `pnpm lint`) and **backend** job (`go build ./...` + `go vet`). Both are verified green locally.

*(Optional but recommended: re-path the Go module from the interim `vibaar/backend` to `github.com/<ORG>/<REPO>/services/backend` — one sweep: `cd services/backend && go mod edit -module <path> && grep -rl '"vibaar/backend/' --include='*.go' . | xargs sed -i '' 's|"vibaar/backend/|"<path>/|g' && go build ./...`)*

## 2. Rotate secrets → new-brand provider accounts

Open fresh accounts/keys under vibaar and fill new `.env` files (real ones were intentionally NOT committed). Providers in use:

| Env area | Keys |
|---|---|
| **Backend** (`services/backend/.env`) | DB (`DB_HOST/PORT/USER/PASSWORD/NAME`), Paystack, Cloudinary, Shipbubble, mail/SMS, WhatsApp (`instashop_webhook_verify_token` → set a real one), Sentry DSN, Google/Instagram/TikTok OAuth |
| **Web** (`apps/web/.env.local`) | `NEXT_PUBLIC_API_BASE_URL`, Sentry, Mapbox/Google Maps, any OAuth client IDs |
| **Admin** (`apps/admin/.env.local`) | `NEXT_PUBLIC_API_BASE_URL` (defaults to `:8088/api/v1`), Sentry |

Templates: `services/backend/.env.example` + `sample.env`, `apps/admin/.env.example`. This closes **E0.1** (old committed secrets become dead keys once rotated).

## 3. Vercel — web + admin

Two projects, same repo, different **Root Directory**:
- **web** → Root `apps/web`, Framework Next.js, Build `pnpm build` (Vercel detects turbo/pnpm), add web env vars.
- **admin** → Root `apps/admin`, same, add admin env vars.

Vercel monorepo auto-detects pnpm workspaces; set the Root Directory and it builds only that app. Add the production domains (`vibaar.com`, `admin.vibaar.com`).

## 4. Render — backend

- New **Web Service** from the repo, Root `services/backend` (a `Dockerfile` is present), or a Go environment with `go build ./... && ./<bin>`.
- Add all backend env vars; point at the production DB.
- Health check path → an existing GET route.

## 5. Production DB

Provision a Postgres under vibaar (Render/Neon/RDS). Then run migrations + seed. **Today the backend uses GORM AutoMigrate on startup** (see B9 below for the migration-tooling upgrade). Verify with a smoke query after first boot.

## 6. Wire the CORS + callback URLs

- **Backend CORS** (`services/backend/internal/adapter/api/middleware/cors.go`): replace the old `instashop-web*.vercel.app` allow-list entries with the new Vercel URLs + `https://vibaar.com`.
- **OAuth callback URLs**: update Google/Instagram/TikTok console redirect URIs to the vibaar domains.
- **Paystack/Shipbubble webhooks**: point at the new `admin.vibaar.com`/backend webhook routes.

## 7. Finish the brand (deferred owner items)

- Drop the new **logo** at `apps/web/public/images/` and update the one reference in `apps/web/src/features/seller-shell/DesktopNav.tsx` (`/images/instashop_logo_black.svg`).
- **Brand color**: keep `#FE2C55` or change the single line `--brand-rgb` in `apps/web/src/styles/globals.css`.
- Confirm the vibaar-default **emails/social handles** I set (search `@vibaar.com`, `tiktok.com/@vibaar`, etc.).

## 8. Cutover

- End-to-end smoke: signup → store → product → order → payment → payout.
- Sign off the two pending web QA items (W3.7 type-scale, W4.6 reorg) + a visual pass on `@vibaar/ui`.
- **Archive** the old `Getinstashop-co` repos read-only (they hold the only pre-vibaar git history).

---

## Non-blocking backend follow-ups (post-launch, engineering)

- **B9 — migration tooling.** Replace fragile GORM AutoMigrate with **goose** (or golang-migrate) + a `schema_migrations` ledger. Recommended safe path: adopt goose on the *existing* DB by marking the current schema as a no-op baseline (`00001_baseline`), then all future schema changes are versioned migrations; keep AutoMigrate behind a dev-only flag during transition. **Needs a design sign-off + a test pass against a throwaway DB — it changes ops, so do it deliberately, not on launch day.**
- **B1 — tx-wrap** the payment-confirmation sequence (needs tx-aware repos / DI refactor + tests; acute double-credit already closed by E0.3).
- **M5 — admin adopts the shared packages** (`@vibaar/types`, `api-client`, `ui`). Large reconciliation — admin's data layer + UI diverge from web's; plan it as its own effort.
