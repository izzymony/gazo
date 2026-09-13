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
  "unknown-css-var",
  "raw-hex",
  "arbitrary-utility",
  "legacy-type-scale",
  "raw-palette-color",
  "inline-style",
  // The REPLICA categories. These were advisory — they printed a number and
  // failed nothing, which is exactly why there are 85 hand-rolled buttons and
  // 108 non-interactive onClicks: a new one could always land with every gate
  // green. Ratcheted, they can only ever go down, so "edit the component and
  // every occurrence moves" becomes a property the build defends rather than a
  // claim that decays.
  "native-button",
  "inline-svg",
  "non-interactive-onclick",
  // Announcing a write nobody verified. A product edit displayed "Product
  // updated successfully!" beside the real error because the store swallowed
  // the rejection and the component toasted regardless. Ratcheted on the
  // toast shape only, which needs no guess about what counts as a write.
  "unverified-success",
];
// `unverified-navigation` is advisory on purpose: "is this call a write?" is
// not statically decidable, so the rule leans on naming and will have false
// positives. Advisory surfaces them without blocking; promote it once the
// noise is understood.
const ADVISORY = ["dynamic-classname", "unverified-navigation"];

/**
 * Test sources are not a production surface. A fixture that uses an inline
 * style or a raw hex to exercise a component is not design drift, and counting
 * it means the suite fights the ratchet. Applied to BOTH the main scan and the
 * adoption scan — it was previously wired into adoption only.
 */
const isTestSource = (file) => /(^|[/\\])__tests__([/\\])|\.(test|spec)\.[^.]+$/.test(file);

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
 * Every source file that writes a className must be reachable by a Tailwind
 * `content` glob, or its classes are purged and simply never render.
 *
 * This is invisible to every other gate: tsc, lint and the build all pass, and
 * the utility is absent from the stylesheet. It has bitten twice — `./src/pages`
 * outlived the App Router move, and `./src/hooks` was never listed at all, so
 * the address picker's hover and active states emitted no CSS on both the
 * seller and buyer shipping flows.
 *
 * Reports directories holding className strings that no glob covers, and globs
 * whose base directory no longer exists (the stale entry that hides the gap).
 */
function contentCoverage() {
  const config = require_("tailwindcss/resolveConfig")(
    require_("tailwindcss/lib/lib/load-config").loadConfig(join(APP_ROOT, "tailwind.config.ts"))
  );
  const globs = (Array.isArray(config.content) ? config.content : config.content?.files) ?? [];

  const staleGlobs = [];
  const globDirs = [];
  for (const glob of globs) {
    if (typeof glob !== "string") continue;
    const base = glob.split("*")[0].replace(/\/+$/, "");
    const abs = base.startsWith("/") ? base : join(APP_ROOT, base);
    if (!existsSync(abs)) staleGlobs.push(glob);
    else globDirs.push(abs);
  }

  // Directories under src/ that hold a className but sit under no glob.
  const uncovered = new Set();
  for (const file of sourceFiles(join(APP_ROOT, "src"))) {
    if (!globDirs.some((dir) => file.startsWith(dir + "/"))) {
      let src = "";
      try {
        src = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (/className\s*=/.test(src)) uncovered.add(relative(APP_ROOT, dirname(file)));
    }
  }
  return { staleGlobs, uncoveredDirs: [...uncovered].sort() };
}

/**
 * Class names defined by hand in the app's own CSS (globals.css,
 * responsive-utils.css, vendor themes). These are real classes that Tailwind
 * knows nothing about, so they must not be reported as unknown utilities.
 */
/**
 * Every CSS custom property the design tokens actually define.
 *
 * The audit validated Tailwind CLASSES through Tailwind's own engine but never
 * looked at `var(--x)` references in style objects and SVG fill/stroke. So when
 * the ink ramp was retired, `var(--ink-5)` in a star rating kept compiling,
 * kept passing lint, and silently rendered an invalid colour. The same was true
 * of `var(--warning)` after the status tokens were restructured — broken for
 * some time with nothing to catch it.
 */
function knownCssVars() {
  const { cssVariables } = require_("@vibaar/design-tokens/tokens");
  return new Set(Object.keys(cssVariables));
}

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
        // `(dev)` is the local-only playground; `_draft` holds routes parked
        // out of every production build (see next.config pageExtensions). Both
        // are real code but neither ships, so counting them makes the drift
        // figures describe something the product does not contain.
        if (entry.name === "node_modules" || entry.name === "(dev)" || entry.name === "_draft")
          continue;
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
  // Block comments first, then line comments. Both are blanked rather than
  // deleted so every reported line number still points at the real line.
  //
  // Line comments matter: prose inside one is not code, but the class scanner
  // reads quoted text, so a comment explaining a variant with examples like
  // "Change" or "Resend code" had those words reported as dead utilities. The
  // `[^:"'\`]` guard keeps `https://…` and any `//` inside a string intact.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'\`\\])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
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

/**
 * The full opening tag starting at `index`, brace- and string-aware.
 *
 * A regex cannot do this: an attribute value like `onClick={() => f(a > b)}`
 * contains both `>` and nested braces, so `<div[^>]*>` stops in the middle of
 * the handler and the check silently misses every element that has one.
 */
function readTag(src, index) {
  let depth = 0;
  let quote = null;
  // Bounded: an opening tag is never this long, and without a limit an
  // unbalanceable brace makes every call scan to end-of-file — quadratic on a
  // 1,600-line component.
  const limit = Math.min(src.length, index + 4000);
  for (let i = index; i < limit; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
    } else if (c === '"' || c === "'" || c === "`") {
      quote = c;
    } else if (c === "{") depth += 1;
    else if (c === "}") depth -= 1;
    else if (c === ">" && depth === 0) return src.slice(index, i + 1);
  }
  return src.slice(index, limit);
}

/**
 * Index of the `}` closing the block opened at `open`. Quote-aware in the same
 * shallow way as readTag above: enough for real source, and a miss only costs
 * a finding rather than a wrong one.
 */
function matchBrace(src, open) {
  let depth = 0;
  let quote = null;
  let comment = null; // "line" | "block"
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    const next = src[i + 1];

    // Comments MUST be skipped, not just quotes: an apostrophe in prose
    // ("there's a new image") otherwise opens a string that never closes, and
    // the rest of the function stops being tracked at all.
    if (comment === "line") {
      if (c === "\n") comment = null;
      continue;
    }
    if (comment === "block") {
      if (c === "*" && next === "/") {
        comment = null;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === "/" && next === "/") {
      comment = "line";
      i += 1;
    } else if (c === "/" && next === "*") {
      comment = "block";
      i += 1;
    } else if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Character ranges inside a `try { ... }` block. */
function tryBlockRanges(src) {
  const ranges = [];
  for (const m of src.matchAll(/\btry\s*\{/g)) {
    const open = src.indexOf("{", m.index);
    const close = matchBrace(src, open);
    if (close > open) ranges.push([open, close]);
  }
  return ranges;
}

/** `src` from `index` through `lines` more newlines — the look-ahead window. */
function sliceLines(src, index, lines) {
  let seen = 0;
  for (let i = index; i < src.length; i += 1) {
    if (src[i] !== "\n") continue;
    seen += 1;
    if (seen > lines) return src.slice(index, i);
  }
  return src.slice(index);
}

/**
 * Cut a look-ahead at the end of the enclosing function body — a line holding
 * nothing but a closing brace. Without it the window runs past `};` into the
 * next declaration and matches a `router.back()` that belongs to unrelated JSX.
 * Applied to the navigation rule only: the success rule must keep looking past
 * the `}` of an intervening if/else to see the toast that follows it.
 */
const stopAtBlockEnd = (text) => text.split(/\n\s*\}[;,)]?\s*(?=\n)/)[0];

/** Reads may be followed by anything; an unchecked WRITE is what lies. */
const READ_PREFIX = /^(?:get|fetch|load|refresh|read|list|search|resolve|use|validate)/i;

function analyseFile(path, src, isRealClass, cssClasses, exemptions, knownVars) {
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

  // A var() that no design token defines. Locally-declared ones (a component
  // setting its own --x in the same file, as Figma exports do) are fine.
  const declaredHere = new Set([...src.matchAll(/["']?(--[\w-]+)["']?\s*:/g)].map((m) => m[1]));
  for (const m of src.matchAll(/var\((--[\w-]+)\)/g)) {
    if (!knownVars.has(m[1]) && !declaredHere.has(m[1])) add("unknown-css-var", m.index, m[1]);
  }
  // The REPLICA checks below ask "did you hand-roll something the design system
  // already provides?". Inside the design system there is nothing to reach for:
  // Button must render a <button>, the icon set must contain <svg>, and
  // penalising the primitives for being primitives would make the number mean
  // the opposite of what it says. Library quality is held by its own test
  // suites and by the other categories, which still apply here.
  const isLibraryInternal = rel.startsWith("packages/ui/src/");

  if (!isLibraryInternal) {
    for (const m of src.matchAll(/<button\b/g)) add("native-button", m.index, "<button>");
    for (const m of src.matchAll(/<svg\b/g)) add("inline-svg", m.index, "<svg>");
  }

  // An onClick on an element that is not interactive. It is not focusable, has
  // no role, and ignores Enter and Space — so the affordance exists for a mouse
  // and for nobody else. This was the single most common defect across the
  // app's surfaces and nothing measured it: the buyer nav, the marketplace
  // vendor card, the product tile, the filter pills and the shop switcher all
  // shipped it. Gestures are excluded — a drag surface legitimately listens for
  // a pointer, and its keyboard path is a separate affordance.
  for (const m of src.matchAll(/<(div|span|p|li|section|article|img|label)\b/g)) {
    if (isLibraryInternal) break;
    const tag = readTag(src, m.index);
    if (!/\bonClick=/.test(tag)) continue;
    if (/\bonTouch(Start|Move|End)=|\bonMouseDown=|\bonDrag/.test(tag)) continue;
    add("non-interactive-onclick", m.index, `<${m[1]} onClick>`);
  }

  // --- writes announced without being verified -----------------------------
  // An `await` OUTSIDE any try block cannot tell success from failure: if the
  // action re-throws the rejection is unhandled, and if it swallows (the
  // common case here — 100+ catch blocks return normally on error) the next
  // line runs on a write that never landed. Announcing or navigating there
  // tells the user something untrue.
  const tryRanges = tryBlockRanges(src);
  const guarded = (i) => tryRanges.some(([open, close]) => i > open && i < close);

  for (const m of src.matchAll(/\bawait\s+([A-Za-z_$][\w$.]*)\s*\(/g)) {
    if (guarded(m.index)) continue;
    const callee = m[1];
    const ahead = sliceLines(src, m.index, 10);

    if (/\btoast\.success\s*\(/.test(ahead)) {
      add("unverified-success", m.index, `await ${callee}() then toast.success`);
    }
    if (
      !READ_PREFIX.test(callee.split(".").pop()) &&
      /\brouter\.(push|back|replace)\s*\(/.test(stopAtBlockEnd(ahead))
    ) {
      add("unverified-navigation", m.index, `await ${callee}() then router navigation`);
    }
  }

  // The callback shape the await rule cannot see: `write().then(() => router…)`
  // with no `.catch`. This is how a failed payout account still sent the seller
  // to the payouts list as though it had been added.
  for (const m of src.matchAll(/\.then\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)) {
    const ahead = sliceLines(src, m.index, 6);
    if (!/\brouter\.(push|back|replace)\s*\(/.test(ahead)) continue;
    if (/\.catch\s*\(/.test(ahead)) continue;
    add("unverified-navigation", m.index, ".then(() => router…) with no .catch");
  }

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
    if (isTestSource(file)) continue;
    components.set(relative(UI_SRC, file).replace(/\.tsx?$/, ""), new Set());
  }

  const scan = [...sourceFiles(join(APP_ROOT, "src")), ...sourceFiles(UI_SRC)].filter(
    (file) => !isTestSource(file)
  );
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
const knownVars = knownCssVars();

const allFindings = [];
const perFileStrings = [];
for (const file of SCAN_ROOTS.flatMap((root) => [...sourceFiles(root)])) {
  if (isTestSource(file)) continue;
  const src = readFileSync(file, "utf8");
  const rel = relative(REPO_ROOT, file);
  const exempt = new Set(
    (exemptions.files ?? []).filter((e) => rel.startsWith(e.path)).flatMap((e) => e.categories)
  );
  perFileStrings.push([rel, extractClassStrings(src).map((s) => s.text)]);
  for (const f of analyseFile(file, src, isRealClass, cssClasses, exemptions, knownVars)) {
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
const coverage = contentCoverage();

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
  contentCoverage: coverage,
  componentAdoption: [...adoption.entries()]
    .map(([component, importers]) => {
      const productionImporters = [...importers].sort();
      return {
        component,
        importers: productionImporters,
        appImporters: productionImporters.filter((file) => file.startsWith("apps/web/src/")),
      };
    })
    .sort((a, b) => a.component.localeCompare(b.component)),
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
if (coverage.staleGlobs.length || coverage.uncoveredDirs.length) {
  console.log("\n  TAILWIND CONTENT COVERAGE — classes here are purged and never render:");
  for (const dir of coverage.uncoveredDirs) console.log(`    uncovered  ${dir}`);
  for (const glob of coverage.staleGlobs) console.log(`    stale glob ${glob}  (base directory does not exist)`);
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
