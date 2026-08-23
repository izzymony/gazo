# Component-library-first review checklist (W5.2)

A guardrail for every PR that adds or changes UI. The goal: **reuse or extend before you create.** New primitives are the last resort — they fragment the design system and re-introduce the drift the revamp just removed.

Run this before requesting review, and again when reviewing someone else's UI change.

## 1. Before creating any component

- [ ] **Searched the shared library first.** For web, `apps/web/src/design-system/common/` (Button, Card, Dialog, InputField, Switch, Tabs, Typography, Avatar, EmptyState, ErrorState, Loader, IconButton, …). For admin, `apps/admin/src/components/common/`. Shared primitives will move to `@vibaar/ui` — check there too as it grows.
- [ ] **Checked `@vibaar/*` packages** (`utils` for `cn`/formatters, `config` for tokens/preset) before hand-rolling a helper.
- [ ] If a near-match exists: **extend it** (add a variant/prop) rather than clone it. Enhance existing > modify existing > create new.
- [ ] A genuinely new primitive is justified in the PR description (what existing one was considered and why it didn't fit).

## 2. Tokens, not literals

- [ ] No hardcoded hex colors (`#FE2C55`, `#000`) — use brand/ink/semantic tokens.
- [ ] No arbitrary Tailwind values (`text-[13px]`, `bg-[#…]`, `w-[37px]`) where a scale token exists (`text-body`, `text-caption`, spacing scale).
- [ ] Type uses the semantic scale (display/h1/h2/body-lg/body/body-sm/caption/micro), not ad-hoc sizes.
- [ ] Radius/shadow/z-index from tokens (`rounded-card`, `shadow-pop`, `z-*`), not literals.
- [ ] Icons come from the icon system (HugeIcons in web), not inline hand-drawn SVG.

## 3. Mobile-first & accessibility (Nigerian mobile context)

- [ ] Touch targets ≥ 36px; layout verified at a narrow mobile width first.
- [ ] Works on a slow connection (no layout shift waiting on data; skeleton/EmptyState/ErrorState used).
- [ ] Keyboard focus is visible; interactive elements are real buttons/links; images have alt text.

## 4. Correctness & consistency

- [ ] Reuses the shared primitive's variant states (loading/disabled/error) instead of re-implementing them.
- [ ] Follows the surrounding file's idiom (naming, structure, comment density).
- [ ] `cn()` from `@vibaar/utils` for class merging (never manual string concatenation of conflicting utilities).
- [ ] No `any` without a written justification; proper interfaces for props.

## 5. Gates (must pass before merge)

- [ ] `pnpm type-check` → 0 (tsc `--noEmit`).
- [ ] `pnpm lint` → 0 errors.
- [ ] For backend: `go build ./...` + `go vet ./...` → 0.
- [ ] Money-path changes are behavior-preserving (emit side-effects post-commit, best-effort; never mutate money in a notification/analytics path).

---

**One-line rule:** if you're about to write `<div className="w-9 h-9 flex items-center …">` or a second `Button`, stop — the primitive already exists. Reach for it, or extend it.
