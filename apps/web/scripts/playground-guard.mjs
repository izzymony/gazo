#!/usr/bin/env node
/**
 * Local-only design-system playground — build/deploy guard.
 *
 * The playground route lives INSIDE the app (src/app/(dev)/) on purpose: that
 * is the only way it renders through the real Tailwind preset, the real
 * globals.css tokens and the real @vibaar/ui components, so what you see is
 * exactly what ships. The cost of living inside the app is that a local
 * `next build` / `cf:deploy` would happily bundle and upload it even though it
 * is git-ignored. This script closes that hole.
 *
 * Guarantees, in order of strength:
 *   0. dev interlock — refuse before touching the tree or .next when port 3000
 *                      is active, so a build cannot invalidate a live server.
 *   1. park/restore  — the directory is moved OUT of the app tree for the whole
 *                      duration of every build, so it cannot be compiled in.
 *   2. assert-build-clean — the build output is scanned afterwards; any trace
 *                      of the route fails the command.
 *   3. assert-untracked  — CI fails if anything under the directory is ever
 *                      committed.
 *   (4. the route file itself calls notFound() outside development.)
 *
 * pnpm 9 has enable-pre-post-scripts=false, so `prebuild`/`postbuild` hooks are
 * NOT run. Everything therefore goes through `run -- <cmd>` wired explicitly
 * into package.json rather than relying on lifecycle hooks.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs";
import { portIsListening } from "../../../scripts/assert-no-dev-server.mjs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The playground lives here in development… */
const LIVE_DIR = join(APP_ROOT, "src", "app", "(dev)");
/** …and is moved here for the duration of a build. Also git-ignored. */
const PARKED_DIR = join(APP_ROOT, ".playground-parked");

/** Build outputs to scan, relative to the app root. */
const BUILD_OUTPUTS = [process.env.NEXT_DIST_DIR || ".next", ".open-next"];
/** Directories inside a build output that are pure cache and safe to skip. */
const SKIP_DIRS = new Set(["cache"]);
/**
 * Path fragments that must never appear in build output.
 *
 * The playground: "(dev)" is the route group, and the segment name is matched
 * separately so a rename of the leaf route still trips the second needle.
 *
 * Draft routes: a `page.draft.tsx` is only a route when `draft.tsx` is in
 * `pageExtensions`, which next.config does in development and never in a
 * production build. That is a config flag rather than a missing file, so it is
 * one edit away from silently shipping — these needles make the build fail
 * loudly instead. They are checked against the route manifests, which name
 * every app route even when emitted filenames are hashed.
 *
 * The playground and the drafts differ in one important way: the playground is
 * GITIGNORED and `assert-untracked` fails if it is ever committed, whereas
 * drafts are TRACKED on purpose — they are planned work waiting to be picked
 * up. Only the build-output rule applies to them.
 */
const NEEDLES = ["(dev)", "local-design-system", "shop/new", "features/shop/_draft"];
const DEV_PORT = 3000;

const say = (msg) => console.log(`[playground-guard] ${msg}`);
const die = (msg) => {
  console.error(`[playground-guard] ERROR: ${msg}`);
  process.exit(1);
};



async function assertNoDevServer() {
  // A build writing to its own distDir cannot corrupt the .next a dev server is
  // reading, so the interlock does not apply.
  if (process.env.NEXT_DIST_DIR && process.env.NEXT_DIST_DIR !== ".next") {
    say(
      `building into ${process.env.NEXT_DIST_DIR} — a dev server's .next is not touched. ` +
        `NOTE: the playground directory is still parked for the duration, so a running dev ` +
        `server loses its /local-design-system routes until restarted.`
    );
    return;
  }
  if (await portIsListening(DEV_PORT)) {
    die(
      `port ${DEV_PORT} is active. A Next build replaces .next while the dev server is still reading it, ` +
        `which leaves the running app serving stale or missing chunks.\n\n` +
        `Stop the dev server, run the guarded build, then restart development on port ${DEV_PORT}.`
    );
  }
  say(`port ${DEV_PORT} is free — safe to replace build output`);
}

function park() {
  if (existsSync(LIVE_DIR) && existsSync(PARKED_DIR)) {
    die(
      `both ${LIVE_DIR} and ${PARKED_DIR} exist — refusing to guess which is current.\n` +
        `Merge them by hand, delete the stale one, then re-run.`
    );
  }
  if (!existsSync(LIVE_DIR)) return false; // nothing to park (CI, fresh clone)
  renameSync(LIVE_DIR, PARKED_DIR);
  // A dev server that has served the playground leaves generated route types
  // behind in .next/types. Those import the very files we just parked, so the
  // build's type-check fails on paths that no longer exist. They are generated
  // artefacts and dev recreates them on demand.
  for (const dir of [".next", process.env.NEXT_DIST_DIR].filter(Boolean)) {
    const stale = join(APP_ROOT, dir, "types", "app", "(dev)");
    if (existsSync(stale)) {
      rmSync(stale, { recursive: true, force: true });
      say(`cleared stale generated types in ${dir}/types/app/(dev)`);
    }
  }
  say("playground parked out of the app tree for this build");
  return true;
}

function restore() {
  if (!existsSync(PARKED_DIR)) return false;
  if (existsSync(LIVE_DIR)) {
    die(
      `${LIVE_DIR} reappeared while a parked copy exists at ${PARKED_DIR}.\n` +
        `Merge them by hand, delete the stale one, then re-run.`
    );
  }
  renameSync(PARKED_DIR, LIVE_DIR);
  say("playground restored");
  return true;
}

/** Every file path under `dir`, skipping known cache directories. */
function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // unreadable or vanished mid-walk — nothing to assert on
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function assertBuildClean() {
  const hits = [];

  for (const output of BUILD_OUTPUTS) {
    const root = join(APP_ROOT, output);
    if (!existsSync(root)) continue;

    // (a) any emitted FILE PATH carrying the route
    for (const file of walk(root)) {
      const rel = file.slice(APP_ROOT.length + 1);
      if (NEEDLES.some((n) => rel.includes(n))) hits.push(`path: ${rel}`);
    }

    // (b) the route manifests, whose CONTENT names every app route even when
    //     the emitted filenames are hashed
    for (const manifest of [
      "app-path-routes-manifest.json",
      "routes-manifest.json",
      "prerender-manifest.json",
      "build-manifest.json",
    ]) {
      const path = join(root, manifest);
      if (!existsSync(path) || !statSync(path).isFile()) continue;
      const body = readFileSync(path, "utf8");
      for (const needle of NEEDLES) {
        if (body.includes(needle)) hits.push(`manifest: ${output}/${manifest} mentions "${needle}"`);
      }
    }
  }

  if (hits.length) {
    // Name the likely cause per kind, because the two have different fixes: a
    // playground hit means parking failed, a draft hit means the route was
    // built as a page (pageExtensions), and either can also be a STALE output
    // directory left by an earlier build — .open-next in particular survives a
    // .next-only rebuild and is what gets deployed.
    const draftHit = hits.some((h) => h.includes("shop/new") || h.includes("_draft"));
    const cause = draftHit
      ? "A draft route was built as a page. Check `pageExtensions` in next.config.mjs — `draft.tsx` must be excluded outside development."
      : "The playground was NOT parked correctly.";
    die(
      `local-only routes leaked into the build output:\n  ` +
        hits.slice(0, 20).join("\n  ") +
        (hits.length > 20 ? `\n  …and ${hits.length - 20} more` : "") +
        `\n\n${cause}\nIf these paths look old, the output directory is stale — remove it and rebuild.` +
        `\nDo not deploy this output.`
    );
  }
  say(`build output clean — no playground or draft route in ${BUILD_OUTPUTS.join(" / ")}`);
}

function git(args) {
  return new Promise((resolveGit) => {
    const child = spawn("git", args, { cwd: APP_ROOT, stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => resolveGit({ code, out: out.trim() }));
    child.on("error", () => resolveGit({ code: 1, out: "" }));
  });
}

async function assertUntracked() {
  // Both the live and parked locations, so a build interrupted mid-park can't
  // leave a window where the playground is committable.
  for (const pathspec of ["src/app/(dev)", ".playground-parked"]) {
    const { out } = await git(["ls-files", "--", pathspec]);
    if (out) {
      die(
        `these playground files are TRACKED by git and must never be committed:\n  ` +
          out.split("\n").join("\n  ") +
          `\n\nRun:  git rm -r --cached "apps/web/${pathspec}"`
      );
    }
  }

  // The ignore rule itself must exist, or the files are merely un-added today
  // and one `git add -A` away from being committed tomorrow.
  //
  // The TRAILING SLASH on the query is load-bearing. The rule in .gitignore is
  // `apps/web/src/app/(dev)/`, and a trailing slash there means "directories
  // only" — so git must know the path IS a directory for the rule to match.
  // Given a bare `src/app/(dev)` it decides that by looking at the filesystem,
  // which means the check passed on a developer machine (playground present)
  // and could only ever fail on CI, where the directory is ignored and so never
  // exists. Asking about `src/app/(dev)/` states the path is a directory and
  // makes the answer independent of whether it happens to be there.
  const { code } = await git(["check-ignore", "-q", "src/app/(dev)/"]);
  if (code !== 0) {
    die(
      `src/app/(dev)/ is not covered by a .gitignore rule.\n` +
        `Add "apps/web/src/app/(dev)/" to the repo root .gitignore.`
    );
  }

  say("playground is untracked and ignore-rule is in place");
}

async function runGuarded(argv) {
  if (!argv.length) die("`run` needs a command: run -- <cmd> [args…]");
  await assertNoDevServer();
  const [cmd, ...args] = argv;
  const parked = park();

  const child = spawn(cmd, args, { cwd: APP_ROOT, stdio: "inherit", env: process.env });

  const restoreOnce = (() => {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      if (parked) restore();
    };
  })();

  // A Ctrl-C during the build must not strand the playground outside the tree.
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      restoreOnce();
      process.exit(130);
    });
  }

  child.on("close", (code, signal) => {
    restoreOnce();
    if (code !== 0 || signal) {
      // Build failed — its own output is the useful error; asserting on a
      // half-written .next would only add noise.
      process.exit(code ?? 1);
    }
    assertBuildClean();
  });

  child.on("error", (err) => {
    restoreOnce();
    die(`could not run "${cmd}": ${err.message}`);
  });
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case "park":
    park();
    break;
  case "restore":
    restore();
    break;
  case "assert-build-clean":
    assertBuildClean();
    break;
  case "assert-untracked":
    await assertUntracked();
    break;
  case "assert-no-dev":
    await assertNoDevServer();
    break;
  case "run":
    await runGuarded(rest[0] === "--" ? rest.slice(1) : rest);
    break;
  default:
    die(`unknown command "${command ?? ""}". Use: park | restore | assert-build-clean | assert-untracked | assert-no-dev | run -- <cmd>`);
}
