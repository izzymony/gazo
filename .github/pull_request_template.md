<!--
Component-library-first guardrail (W5.2). Full checklist + rationale:
docs/component-review-checklist.md. Tick the boxes; delete any section that
doesn't apply (e.g. the UI block for a backend-only PR).
-->

## What & why



## Component-library-first (UI changes) — [full checklist](docs/component-review-checklist.md)

- [ ] Searched the shared library (`design-system/common`, `@vibaar/ui`) and `@vibaar/*` helpers **before** adding a component/helper; **extended** an existing primitive rather than cloning. A genuinely new primitive is justified below.
- [ ] **Tokens, not literals** — no hardcoded hex / arbitrary Tailwind values where a scale exists; semantic type scale; icons from the icon system (HugeIcons), not inline SVG.
- [ ] **Mobile-first + a11y** — ≥36px touch targets, narrow-width first; skeleton / EmptyState / ErrorState; visible focus; alt text.
- [ ] Reuses shared primitives' loading/disabled/error states; `cn()` from `@vibaar/utils` for class merging; no unjustified `any`.

## Gates

- [ ] Web/admin: `pnpm type-check` → 0 · `pnpm lint` → 0 errors
- [ ] Backend: `go build ./...` + `go vet ./...` + `go test ./...` → 0 (add `-tags money_safety_repro` for money-path changes)
- [ ] Money-path changes are behavior-preserving (side-effects emitted post-commit, best-effort; never mutate money in a notification/analytics path)

## New primitive justification (if you added one)

<!-- What existing primitive was considered, and why it didn't fit. Delete if N/A. -->
