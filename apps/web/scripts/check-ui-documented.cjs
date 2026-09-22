#!/usr/bin/env node
/**
 * Which @vibaar/ui modules have a playground specimen?
 *
 * LOCAL ONLY. NEVER WIRE THIS INTO CI.
 *
 * The playground is git-ignored, parked out of every build, and CI asserts
 * nothing under it is tracked. So on a clean checkout the directory this reads
 * does not exist — which is exactly why documentation coverage cannot be a
 * tracked gate, and why `stable` in the registry deliberately does not require
 * a specimen. A rating nobody can verify is not a rating.
 *
 * When the playground is absent this exits 0 with a note. That is correct
 * behaviour, not a skipped check: there is genuinely nothing to measure.
 *
 * It reports; it does not fail. Missing specimens are documentation debt to
 * work through, not a reason to block a commit.
 *
 *   node apps/web/scripts/check-ui-documented.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

const APP_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(APP_ROOT, "..", "..");
const NAV = path.join(APP_ROOT, "src/app/(dev)/local-design-system/_system/nav.ts");

if (!fs.existsSync(NAV)) {
  console.log(
    "\n  Playground not present — nothing to measure.\n" +
      "  This is expected on a clean checkout: the catalogue is local-only by design.\n"
  );
  process.exit(0);
}

const { uiRegistry } = require(path.join(REPO_ROOT, "packages/ui/registry.cjs"));
const nav = fs.readFileSync(NAV, "utf8");

// Every module the catalogue claims to document: `source:` plus the
// `alsoDocuments` lists, which is how grouped specimens (Badge covering
// StoreStatusBadge, TrendIndicator, VerifiedCheck) earn their coverage.
const documented = new Set();
for (const m of nav.matchAll(/source:\s*"([^"]+)"/g)) documented.add(m[1]);
for (const block of nav.matchAll(/alsoDocuments:\s*\[([^\]]+)\]/g))
  for (const m of block[1].matchAll(/"([^"]+)"/g)) documented.add(m[1]);

const shippable = uiRegistry.filter(
  (e) => !["internal", "asset", "deprecated"].includes(e.kind) && !["internal", "deprecated"].includes(e.status)
);
const missing = shippable.filter((e) => !documented.has(e.source));
const pct = Math.round(((shippable.length - missing.length) / shippable.length) * 100);

console.log(`\n  Playground specimen coverage — ${shippable.length - missing.length}/${shippable.length} (${pct}%)\n`);

if (missing.length) {
  const byStatus = { stable: [], candidate: [] };
  for (const e of missing) (byStatus[e.status] ??= []).push(e.source);
  for (const [status, list] of Object.entries(byStatus)) {
    if (!list.length) continue;
    console.log(`  no specimen — ${status} (${list.length}):`);
    for (const s of list.sort()) console.log(`      ${s}`);
    console.log();
  }
  console.log("  Documentation debt, not a gate. Reported so it stays visible.\n");
}
