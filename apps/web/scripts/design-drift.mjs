#!/usr/bin/env node
/**
 * Design-system drift audit — committed, ratcheted, CI-gated.
 *
 * The local playground VISUALISES the design system; this ENFORCES it. The two
 * have different lifecycles on purpose: the playground is git-ignored and dies
 * with the working tree, so nothing that must gate a merge can live there.
 *
 * The headline check is `unknown-utility`: classes that Tailwind cannot
 * generate, so they silently emit no CSS. tsc, ESLint and `next build` all pass
 * on these — the only way to catch them is to ask Tailwind itself. That is done
 * with Tailwind's own engine (loadConfig → resolveConfig → createContext →
 * generateRules), not a regex, so variants, arbitrary values, opacity
 * modifiers, plugin utilities and `important` are all handled correctly.
 *
 * Usage:
 *   node scripts/design-drift.mjs                   report to stdout + .drift/report.json
 *   node scripts/design-drift.mjs --check           ratchet: fail if any bucket worsened
 *   node scripts/design-drift.mjs --update-baseline record current counts as the new floor
 *
 * The ratchet compares against a reviewed baseline rather than demanding zero:
 * the app cannot pass a zero-drift rule today, and a gate nobody can satisfy
 * gets disabled. New violations fail; cleanups lower the floor.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(APP_ROOT, "..", "..");
const UI_SRC = join(REPO_ROOT, "packages", "ui", "src");
const require_ = createRequire(join(APP_ROOT, "package.json"));

const BASELINE_PATH = join(APP_ROOT, "design-drift-baseline.json");
const EXEMPTIONS_PATH = join(APP_ROOT, "design-drift-exemptions.json");
const REPORT_DIR = join(APP_ROOT, ".drift");

/**
 * Directories the ESLint config already treats as deferred (marketing + the
 * storefront/product engine). Reusing those exact boundaries rather than
 * inventing a second taxonomy — one definition of "not swept yet".
 */
const DEFERRED = [
  "apps/web/src/app/(marketing)/",
  "apps/web/src/app/(buyer)/shop/",
  "apps/web/src/features/storefront/",
  "apps/web/src/features/shop/",
  "apps/web/src/features/store-setup/",
  "apps/web/src/features/product-setup/",
];

/**
 * Everything the design system actually ships. packages/ui was missing from an
 * earlier version, which hid the canonical `font-500` in Button's cva base —
 * the very defect that motivated the audit — and made the baseline incomplete.
 */
const SCAN_ROOTS = [join(APP_ROOT, "src"), UI_SRC];

/** Ratcheted categories. Advisory ones are reported but never fail the build. */
const RATCHETED = [
  "unknown-utility",
  "raw-hex",
  "arbitrary-utility",
  "legacy-type-scale",
  "raw-palette-color",
  "inline-style",
];
const ADVISORY = ["native-button", "inline-svg", "dynamic-classname"];

// ---------------------------------------------------------------------------
// Tailwind: the source of truth for "is this class real?"
// ---------------------------------------------------------------------------
function tailwindValidator() {
  const { loadConfig } = require_("tailwindcss/lib/lib/load-config");
  const resolveConfig = require_("tailwindcss/resolveConfig");
  const { createContext } = require_("tailwindcss/lib/lib/setupContextUtils");
  const { generateRules } = require_("tailwindcss/lib/lib/generateRules");

  const config = resolveConfig(loadConfig(join(APP_ROOT, "tailwind.config.ts")));
  const context = createContext(config);
  const cache = new Map();

  return (candidate) => {
    if (cache.has(candidate)) return cache.get(candidate);
    let ok = false;
    try {
      ok = generateRules([candidate], context).length > 0;
    } catch {
      ok = true; // never fail the audit on an engine edge case
    }
    cache.set(candidate, ok);
    return ok;
  };
}

/**
 * Class names defined by hand in the app's own CSS (globals.css,
 * responsive-utils.css, vendor themes). These are real classes that Tailwind
 * knows nothing about, so they must not be reported as unknown utilities.
 */
function handWrittenCssClasses() {
  const names = new Set();
  for (const file of ["src/styles/globals.css", "src/styles/responsive-utils.css"]) {
    const path = join(APP_ROOT, file);
    if (!existsSync(path)) continue;
    for (const m of readFileSync(path, "utf8").matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(m[1]);
  }
  // …and classes defined in inline <style> blocks (styled-jsx). Missing these
  // reports a page's own local CSS classes as dead Tailwind utilities.
  for (const root of SCAN_ROOTS) {
    for (const file of sourceFiles(root)) {
    const src = readFileSync(file, "utf8");
    for (const block of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      for (const m of block[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(m[1]);
    }
    }
  }
  return names;
}

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------
function* sourceFiles(root) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "(dev)") continue;
        stack.push(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        yield full;
      }
    }
  }
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

/**
 * Pull class-name strings out of the places classes actually live —
 * className=…, cn(…), cva(…) — rather than every string literal in the file.
 *
 * The scan is deliberately tight. An earlier, looser version took a fixed
 * character window after the keyword, which swallowed neighbouring JSX props
 * and reported placeholder text and aria-labels as dead classes (7,032 false
 * positives). Only the class expression itself is read now.
 */
function scanBalanced(src, start) {
  const open = src[start];
  const close = open === "(" ? ")" : "}";
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      // skip the whole string so brackets inside it don't move the depth
      const quote = ch;
      i++;
      while (i < src.length && src[i] !== quote) i += src[i] === "\\" ? 2 : 1;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return i;
  }
  return Math.min(src.length - 1, start + 4000);
}

/**
 * Comments are stripped first: a doc comment that MENTIONS className (e.g.
 * `Coloring still works via className="text-*"`) would otherwise be scanned as
 * live code and its prose reported as dead classes.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function extractClassStrings(input) {
  const src = stripComments(input);
  const out = [];
  const re = /\b(className|cn|cva|clsx|twMerge)\s*(=|\()/g;
  let m;
  while ((m = re.exec(src))) {
    let from;
    let to;
    if (m[2] === "(") {
      from = m.index + m[0].length - 1;
      to = scanBalanced(src, from);
    } else {
      // className= … skip whitespace to the value
      let i = m.index + m[0].length;
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src[i] === "{") {
        from = i;
        to = scanBalanced(src, i);
      } else if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
        const quote = src[i];
        let j = i + 1;
        while (j < src.length && src[j] !== quote) j += src[j] === "\\" ? 2 : 1;
        from = i;
        to = j;
      } else {
        continue;
      }
    }
    let chunk = src.slice(from, to + 1);
    // cva()'s `defaultVariants: { variant: "filled", size: "md" }` holds variant
    // KEY NAMES, not class strings — without this, "filled"/"md"/"plain" get
    // reported as dead utilities.
    if (m[1] === "cva") {
      const cut = chunk.indexOf("defaultVariants");
      if (cut !== -1) chunk = chunk.slice(0, cut);
    }
    for (const lit of chunk.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g)) {
      // `className={mode === "store" ? "…" : "…"}` — the comparison operand is
      // a value, not a class list. Without this, "store"/"Spotlights" get
      // reported as dead classes.
      if (/(===|!==|==|!=)\s*$/.test(chunk.slice(0, lit.index))) continue;
      out.push({ text: lit[2], index: from + lit.index });
    }
    re.lastIndex = to;
  }
  return out;
}

const CANDIDATE = /^-?[a-z][a-z0-9]*(?:[-/:.[\]()#%!,+&>~*_a-z0-9]*)$/i;

function analyseFile(path, src, isRealClass, cssClasses, exemptions) {
  const rel = relative(REPO_ROOT, path);
  const findings = [];
  const add = (category, index, detail) =>
    findings.push({ category, file: rel, line: lineOf(src, index), detail });

  // --- class-string driven checks -----------------------------------------
  for (const { text, index } of extractClassStrings(src)) {
    if (text.includes("${")) {
      // A template hole means the final class list is not statically knowable.
      add("dynamic-classname", index, text.trim().slice(0, 80));
    }
    // Drop ${…} holes entirely rather than splitting on the braces — splitting
    // turns `${isSeller.pro ? "a" : "b"}` into bogus candidates like
    // "isSeller.pro" and reports them as dead classes.
    const staticOnly = text.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, " ");
    for (const raw of staticOnly.split(/\s+/)) {
      const token = raw.trim();
      if (!token || token.includes("${") || !CANDIDATE.test(token)) continue;
      const bare = token.replace(/^!/, "");
      if (cssClasses.has(bare)) continue;
      // `group`/`peer` are variant markers: they intentionally emit no CSS on
      // their own and only exist for group-*/peer-* to hook onto.
      if (/^(group|peer)(\/[\w-]+)?$/.test(bare)) continue;

      if (!isRealClass(bare)) {
        // A candidate with unbalanced brackets is the tail of an arbitrary
        // value written with real spaces — e.g.
        // shadow-[0px_2px_24px_0px_rgba(255, 229, 0,0.08)]. Tailwind requires
        // underscores, so the whole utility silently emits nothing. Say that,
        // rather than printing the truncated fragment.
        const unbalanced =
          (bare.match(/\[/g)?.length ?? 0) !== (bare.match(/\]/g)?.length ?? 0) ||
          (bare.match(/\(/g)?.length ?? 0) !== (bare.match(/\)/g)?.length ?? 0);
        add("unknown-utility", index, unbalanced ? `${bare}…  (arbitrary value contains spaces — Tailwind needs _)` : bare);
      }
      if (/^[a-z-]+-\[[^\]]+\]$/i.test(bare)) add("arbitrary-utility", index, bare);
      if (/^(text)-(xs|sm|base|lg|xl|[2-9]xl)$/.test(bare)) add("legacy-type-scale", index, bare);
      if (/^(bg|text|border|ring|fill|stroke|divide|from|to|via)-(gray|slate|zinc|neutral|stone)-\d{2,3}$/.test(bare))
        add("raw-palette-color", index, bare);
    }
  }

  // --- whole-file checks ---------------------------------------------------
  for (const m of src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    if (exemptions.allowedHex[m[0].toUpperCase()]) continue;
    add("raw-hex", m.index, m[0]);
  }
  for (const m of src.matchAll(/style=\{\{/g)) add("inline-style", m.index, "inline style object");
  for (const m of src.matchAll(/<button\b/g)) add("native-button", m.index, "<button>");
  for (const m of src.matchAll(/<svg\b/g)) add("inline-svg", m.index, "<svg>");

  return findings;
}

// ---------------------------------------------------------------------------
// Advisory: duplicated class strings + component adoption
// ---------------------------------------------------------------------------
function duplicateClassStrings(perFileStrings, min = 3) {
  const byString = new Map();
  for (const [file, strings] of perFileStrings) {
    for (const s of new Set(strings)) {
      const key = s.trim().replace(/\s+/g, " ");
      if (key.split(" ").length < 4) continue;
      if (!byString.has(key)) byString.set(key, new Set());
      byString.get(key).add(file);
    }
  }
  return [...byString.entries()]
    .filter(([, files]) => files.size >= min)
    .map(([classes, files]) => ({ classes, files: [...files].sort() }))
    .sort((a, b) => b.files.length - a.files.length);
}

/**
 * Component adoption. Resolves `@vibaar/ui/common/X`, relative `./X` /
 * `../common/X`, AND dynamic `import("…")` specifiers (e.g. next/dynamic:
 * `dynamic(() => import("../../slidingcomponent"))`) — a scan that only saw
 * static `from "…"` reported dynamically-loaded components (and
 * package-internal presets like StoreLogo → Avatar) as false orphans.
 */
function componentAdoption() {
  const components = new Map(); // rel path without extension -> Set(importers)
  for (const file of sourceFiles(UI_SRC)) {
    components.set(relative(UI_SRC, file).replace(/\.tsx?$/, ""), new Set());
  }

  const scan = [...sourceFiles(join(APP_ROOT, "src")), ...sourceFiles(UI_SRC)];
  for (const file of scan) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)) {
      const spec = m[1];
      let key = null;
      if (spec.startsWith("@vibaar/ui/")) {
        key = spec.slice("@vibaar/ui/".length);
        if (key === "icons") key = "icons/index";
      } else if (spec.startsWith(".")) {
        const resolved = resolve(dirname(file), spec);
        if (resolved.startsWith(UI_SRC)) key = relative(UI_SRC, resolved);
      }
      if (key && components.has(key)) components.get(key).add(relative(REPO_ROOT, file));
    }
  }
  return components;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const bucketOf = (relPath) => (DEFERRED.some((d) => relPath.startsWith(d)) ? "deferred" : "live");

const readJson = (path, fallback) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback;

const exemptions = readJson(EXEMPTIONS_PATH, { allowedHex: {}, files: [] });
exemptions.allowedHex = Object.fromEntries(
  Object.entries(exemptions.allowedHex ?? {}).map(([k, v]) => [k.toUpperCase(), v])
);

const isRealClass = tailwindValidator();
const cssClasses = handWrittenCssClasses();

const allFindings = [];
const perFileStrings = [];
for (const file of SCAN_ROOTS.flatMap((root) => [...sourceFiles(root)])) {
  const src = readFileSync(file, "utf8");
  const rel = relative(REPO_ROOT, file);
  const exempt = new Set(
    (exemptions.files ?? []).filter((e) => rel.startsWith(e.path)).flatMap((e) => e.categories)
  );
  perFileStrings.push([rel, extractClassStrings(src).map((s) => s.text)]);
  for (const f of analyseFile(file, src, isRealClass, cssClasses, exemptions)) {
    if (exempt.has(f.category)) continue;
    allFindings.push({ ...f, bucket: bucketOf(f.file) });
  }
}

const counts = {};
for (const category of [...RATCHETED, ...ADVISORY]) counts[category] = { live: 0, deferred: 0 };
for (const f of allFindings) counts[f.category][f.bucket]++;

const adoption = componentAdoption();
const orphans = [...adoption.entries()].filter(([, importers]) => importers.size === 0).map(([k]) => k);
const duplicates = duplicateClassStrings(perFileStrings);

/**
 * Per-finding fingerprints. Category totals alone let a NEW violation hide
 * behind an unrelated cleanup in the same bucket — remove one raw hex, add
 * another, and the count is unchanged. The fingerprint is
 * `category|file|detail` WITHOUT the line number, so moving code around does
 * not churn the baseline while a genuinely new violation still shows up.
 */
const fingerprints = {};
for (const f of allFindings) {
  const key = `${f.category}|${f.file}|${f.detail}`;
  fingerprints[key] = (fingerprints[key] ?? 0) + 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  counts,
  unknownUtilities: allFindings
    .filter((f) => f.category === "unknown-utility")
    .map((f) => `${f.file}:${f.line}  ${f.detail}`),
  orphanComponents: orphans,
  duplicateClassStrings: duplicates.slice(0, 25),
  fingerprints,
  findings: allFindings,
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(join(REPORT_DIR, "report.json"), JSON.stringify(report, null, 2) + "\n");

// --- output ---------------------------------------------------------------
const pad = (s, n) => String(s).padEnd(n);
console.log("\nDesign-system drift\n");
console.log(`  ${pad("category", 22)}${pad("live", 8)}${pad("deferred", 10)}`);
console.log("  " + "-".repeat(40));
for (const category of RATCHETED)
  console.log(`  ${pad(category, 22)}${pad(counts[category].live, 8)}${pad(counts[category].deferred, 10)}`);
console.log("  " + "-".repeat(40) + "  (advisory below)");
for (const category of ADVISORY)
  console.log(`  ${pad(category, 22)}${pad(counts[category].live, 8)}${pad(counts[category].deferred, 10)}`);

const unknown = report.unknownUtilities;
if (unknown.length) {
  console.log(`\n  DEAD CLASSES — these emit no CSS at all (${unknown.length}):`);
  for (const u of unknown.slice(0, 30)) console.log(`    ${u}`);
  if (unknown.length > 30) console.log(`    …and ${unknown.length - 30} more`);
}
if (orphans.length) console.log(`\n  Never-imported @vibaar/ui components: ${orphans.join(", ")}`);
if (duplicates.length)
  console.log(
    `\n  Duplicated class strings across ≥3 files: ${duplicates.length}` +
      ` (advisory — repeated SEMANTICS justify a component, repeated classes may just want a token)`
  );
console.log(`\n  Full report: ${relative(REPO_ROOT, join(REPORT_DIR, "report.json"))}\n`);

if (process.argv.includes("--update-baseline")) {
  const sorted = Object.fromEntries(Object.entries(fingerprints).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, JSON.stringify({ counts, fingerprints: sorted }, null, 2) + "\n");
  console.log(`  Baseline updated: ${relative(REPO_ROOT, BASELINE_PATH)}\n`);
  process.exit(0);
}

if (process.argv.includes("--check")) {
  const baseline = readJson(BASELINE_PATH, null);
  if (!baseline) {
    console.error("  ERROR: no baseline. Run with --update-baseline and commit the result.\n");
    process.exit(1);
  }
  // Finding-level, so a cleanup cannot mask a new violation of the same kind.
  const base = baseline.fingerprints ?? {};
  const worse = [];
  for (const [key, count] of Object.entries(fingerprints)) {
    const [category] = key.split("|");
    if (!RATCHETED.includes(category)) continue;
    const was = base[key] ?? 0;
    if (count > was) {
      const [, file, detail] = key.split("|");
      worse.push(was === 0 ? `NEW  ${category}  ${file}  ${detail}` : `+${count - was}   ${category}  ${file}  ${detail}`);
    }
  }
  if (worse.length) {
    console.error(`  DRIFT INCREASED — ${worse.length} new design-system violation(s):\n`);
    for (const w of worse.slice(0, 40)) console.error(`    ${w}`);
    if (worse.length > 40) console.error(`    …and ${worse.length - 40} more`);
    console.error(
      "\n  Fix them, or if the increase is deliberate and reviewed, re-run with" +
        "\n  --update-baseline and explain the rise in the commit message.\n"
    );
    process.exit(1);
  }
  console.log(`  Ratchet OK — no new violations against ${Object.keys(base).length} baselined findings.\n`);
}
