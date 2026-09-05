# Working alongside another agent

Two agents share this branch. There is no branch separation — the design-system,
app-adoption and website work all touch the same token layer, so splitting them
trades collisions for merge conflicts, which is worse.

Sharing a branch is fine. These are the specific things that break it.

---

## 1. Never `git add -A` / `git add .` / `git commit -a`

**This is the one that has actually caused damage.**

A broad stage sweeps up whatever the other agent has mid-edit in the working
tree and commits it under *your* message. It has already happened once:
`6ac2285` says "restore shadows" and contains 6 lines of shadow fix plus 171
lines of somebody else's auth CTA conversion. The code survived; its
attribution did not.

**Do instead:** stage explicit paths you touched.

```bash
git add apps/web/src/features/auth/AuthOptionButton.tsx apps/web/src/features/auth/signin/SignInOverview.tsx
git commit -m "..."
```

**Before every commit,** check nothing unexpected is staged:

```bash
git status --short          # is anything here not yours?
git diff --cached --stat    # does this match what you changed?
```

If a file you did not touch appears, unstage it (`git restore --staged <path>`)
and leave it alone. It is someone else's work in progress.

## 2. Never `git checkout`, `git restore`, `git stash` or `git clean` broadly

The other agent's work is usually **uncommitted**. At one point ~100 files of
approved token/registry work existed only in the working tree. Any of these
would have destroyed it:

```bash
git checkout .          # NO
git restore .           # NO
git stash               # NO — it hides their work, not just yours
git clean -fd           # NO — deletes the git-ignored playground too
```

Restore single files by explicit path, never the tree.

## 3. Do not assume `HEAD` is where you left it

The branch moves under you. Between one agent's commit and its next turn there
were **20 commits it did not make**. Before you start, and before you commit:

```bash
git log --oneline -5
git status --short
```

If a file you are about to edit changed since you last read it, **re-read it.**
A patch written against a stale copy either fails to apply or applies to the
wrong place.

## 4. Do not run a build while a dev server is running

`next build` replaces `.next` in place. A dev server reading that directory
keeps serving until it requests a chunk that no longer exists — then the running
app 404s on `layout.css` and `main-app.js` and renders unstyled. It looks like a
code bug and is not one. This cost a review cycle.

Both apps now refuse rather than let it happen
(`scripts/assert-no-dev-server.mjs`, wired into web and admin builds). If you
see the refusal, that is the guard working:

```
[dev-guard] admin dev server is active on 3001 …
```

**Correct order:** stop dev → build → restart dev. Web is `:3000`, admin is
`:3001`. Restart what you stopped, and say so — the other agent may be mid-check
against a running server.

## 5. Do not `git push`

Nothing on this branch has ever been pushed and it has no upstream. Pushing
needs the owner's explicit sign-off, every time. `main` is untouched and stays
that way.

## 6. Do not commit the playground

`apps/web/src/app/(dev)/` is git-ignored on purpose and is parked out of the
tree during every build. Never force-add it. CI fails if anything under it is
tracked:

```bash
node apps/web/scripts/playground-guard.mjs assert-untracked
```

## 7. Do not regenerate the drift baseline to make a gate pass

`apps/web/design-drift-baseline.json` is a ratchet. A red gate usually means you
introduced something. Rebaseline **only** when the increase is a genuine
improvement, and say why in the commit message — for example, four dead shadows
becoming live moved them from `unknown-utility` to `arbitrary-utility`, which
reads as new findings but is a fix.

Same for generated files: `packages/design-tokens/tokens.css` is generated from
`tokens.cjs`. Edit the source and run `pnpm --filter @vibaar/design-tokens
generate`. A staleness check will catch a hand-edit.

---

## Before you commit — the whole list

```bash
git status --short                                   # only your files?
pnpm type-check                                      # 3 workspaces
pnpm lint                                            # 0 errors
pnpm test                                            # 4 tasks
node apps/web/scripts/design-drift.mjs --check       # ratchet
# stop dev servers, then:
pnpm build                                           # 66/66, playground absent
```

## Conventions worth keeping

- **Say what you touched** in the commit message, including anything you found
  and deliberately did not fix.
- **Verify, do not report.** "Tests pass" after running them, not after
  expecting them to.
- **If you break something, say so plainly.** The spaces-inside-arbitrary-values
  regression was found and owned by the agent that caused it, which is exactly
  right — that is how it got fixed in six lines instead of becoming folklore.
