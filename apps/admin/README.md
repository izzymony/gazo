# @vibaar/admin

Backoffice for **vibaar** — order and business operations, KYC review, financials, and customer support.

Next.js 14 (App Router) · TypeScript · Tailwind · Zustand.

## Run it

From the monorepo root (not this directory):

```bash
pnpm install
pnpm dev --filter @vibaar/admin     # http://localhost:3001
```

The backend must be running on `http://localhost:8088`. Copy `.env.example` to
`.env.local` and point `NEXT_PUBLIC_API_*` at it.

## Gates

```bash
pnpm type-check --filter @vibaar/admin
pnpm lint       --filter @vibaar/admin
pnpm build      --filter @vibaar/admin
```

## Current state — read before changing things

- **Not yet on the shared packages.** Admin has no `@vibaar/*` dependency; it
  carries its own components, API client and types. Migrating it onto
  `@vibaar/types` / `@vibaar/api-client` / `@vibaar/ui` is tracked as **M5**.
- **`components.json` and the CSS variables are shadcn/ui leftovers that were
  never scaffolded** — there are no shadcn components and no Radix imports. The
  UI is bespoke `common/` components. Don't assume a primitive layer exists.
- **Some screens are read-only on purpose.** Controls that would have called
  endpoints the backend does not implement were disabled rather than left as
  fake affordances (Track 3 / A1), and Settings shows unconfigured values behind
  a read-only banner. If you are wiring a real endpoint, remove the guard
  deliberately — don't re-enable a control without one.
- Brand colour token is `brand` / `brandDark` / `brandLight` in
  `tailwind.config.js`; keep it in sync with web's `--brand-rgb`.

## Where the docs live

| Topic | Location |
|---|---|
| Deploy / launch runbook | [`../../docs/DEPLOY.md`](../../docs/DEPLOY.md) |
| Roadmap, audits, execution tracker | `product-management/` in the workspace root |
| Monorepo overview | [`../../README.md`](../../README.md) |

> The previous eight planning documents in this directory (session log,
> branching strategy, deployment strategy, implementation roadmap, architecture,
> workflow guidelines, branch setup) described the pre-monorepo
> `instashop-admin` repo — stale paths, old brand, superseded deploy targets and
> default admin passwords. They were removed on 2026-08-28; the pre-monorepo
> history still has them.
