# vibaar

Monorepo for **vibaar** — a global social-commerce platform (formerly "myInstaShop"). Buyers discover from Instagram/TikTok-style sellers; escrow + tracking build trust.

This repo is a **fresh, clean-history start** created during the rebrand. It deliberately does **not** import the old per-repo git history (which carried ~145 MB of binary assets, ~184 MB of committed Go binaries, and real secret env files). The three former standalone repos live on as read-only archives under the old brand; their code was copied in at its current state as a single clean baseline.

## Layout

```
vibaar/
├── apps/
│   ├── web/            # Next.js 14 storefront + seller dashboard  (was instashop-web)
│   └── admin/          # Next.js 14 backoffice / admin portal      (was instashop-admin)
├── services/
│   └── backend/        # Go + Gin API, module `insta-api`          (was instashop-backend)
├── packages/
│   ├── utils/          # @vibaar/utils — shared cn() (canonical, with the tailwind-merge font-size fix)
│   └── config/         # @vibaar/config — shared tsconfig.base + tailwind-preset seed
├── pnpm-workspace.yaml # workspace = apps/* + packages/*  (backend is NOT a JS member)
├── turbo.json          # build / dev / lint / type-check pipeline
├── package.json        # root scripts via turbo; packageManager pnpm
├── .nvmrc              # Node 20
└── .npmrc              # shamefully-hoist (apps came from flat-npm repos)
```

`services/backend` is a standalone Go module — it builds with `go build ./...`, not pnpm/turbo, and is intentionally excluded from the JS workspace.

## Getting started

```bash
nvm use                 # Node 20
corepack enable         # provides pnpm@9
pnpm install            # installs apps/* + packages/*
pnpm dev                # turbo runs web (:3000) + admin (:3001)

# backend (separate toolchain)
cd services/backend && go build ./... && go run .
```

**Env:** real `.env` files were intentionally NOT copied (they'll be rotated under the new brand). Copy the templates and fill them in:
- `apps/web` — needs a fresh `.env.local`
- `apps/admin/.env.example` → `.env.local`
- `services/backend/.env.example` (or `sample.env`) → `.env`

## Shared packages — current state & migration path

The two apps were built independently and **share almost no code today**, so the shared-package layer is being grown incrementally rather than force-merged on day one:

| Package | Status | Notes |
|---|---|---|
| `@vibaar/utils` | ✅ real | Canonical `cn()`. Apps still use their own local `cn`; migrate call sites onto this next. |
| `@vibaar/config` | ✅ seed | `tsconfig.base.json` + a `tailwind-preset` seed (brand token only). Apps keep their own configs until adopted. |
| `@vibaar/ui` | ⏳ follow-up | Canonical = web's `apps/web/src/design-system/` (60 files). Admin's bespoke `common/` primitives adopt later. |
| `@vibaar/types` | ⏳ follow-up | No canonical today (web's `lib/types.ts` vs admin's inline types are disjoint). Reconcile. |
| `@vibaar/api-client` | ⏳ follow-up | Web = axios + interceptors + envelope `unwrap()` + react-query; admin = a `fetch` class + a stray axios service. Reconcile onto web's design; note cookie-vs-localStorage token split. |
| `@vibaar/design-tokens` | ⏳ follow-up | Web ink-ramp/opacity-channel vs admin shadcn-HSL; only brand red is shared. |

### Other tracked follow-ups
- **Dependency unification (M3):** majors currently diverge — zustand v5↔v4, sonner v2↔v1 (admin also ships react-hot-toast), framer-motion v12↔v11, tailwind-merge v3↔v2; form stacks split formik/yup (web) vs react-hook-form/zod (admin). pnpm lets each app keep its versions for now.
- **Asset prune:** `apps/web/public/` still carries ~25 MB of Figma-export assets (`Frame*`, `image`, `figma-assets*`) — prune the unreferenced ones.
- **Go module rename:** `insta-api` → a vibaar-brand module path (touches every import; do as one pass).
- **Adopting workspace packages in Next:** apps consuming raw-TS workspace packages need `transpilePackages: ['@vibaar/utils', …]` in `next.config`.
