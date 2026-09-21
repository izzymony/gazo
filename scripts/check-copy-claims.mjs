#!/usr/bin/env node
/**
 * Fails the build on user-visible copy that claims Vibaar holds customer
 * money.
 *
 * ## Why this is a lint and not a review checklist
 *
 * "The money is held safely… then moves to your wallet… you withdraw" sat on
 * the homepage for months. It is a custody claim, it describes a stored-value
 * product Vibaar does not operate, and nothing in the build caught it — type
 * checking cannot see a sentence. The same wording had already been removed
 * from the auth screens once and came back somewhere else, which is the
 * argument for a machine check rather than another correction.
 *
 * ## What it looks at
 *
 * Comments are stripped, then EVERYTHING else is scanned — string literals,
 * template literals and JSX text alike. JSX text matters: one of the claims
 * this catches lived in `<p>Everyday pieces, protected checkout…</p>`, which a
 * string-literal-only scanner would have walked straight past.
 *
 * Stripping comments is the one exclusion that earns its keep:
 * `features/auth/authScenes.ts` carries a docblock explaining this very
 * prohibition, and it necessarily contains every banned term. A whole-file
 * grep bans its own rationale.
 *
 * ## Two severities, on purpose
 *
 * BLOCKING terms assert custody or a stored-value product. They are factual
 * claims about whose money it is and where it sits, and they are wrong until
 * the payment, refund, dispute and payout policies support them.
 *
 * WARNING terms ("protected") are softer positioning rather than a factual
 * claim. The framing was removed from the marketing site deliberately, and the
 * owner's decision was to warn rather than block, so a future use is visible
 * without being a build error.
 */

import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";

const ROOTS = ["apps/web/src", "apps/admin/src", "packages/ui/src"];
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mdx"];

/**
 * Each term carries the reason it is banned, because a lint failure that only
 * says "forbidden word" gets worked around instead of fixed.
 */
const BLOCKING = [
  ["escrow", "asserts a legal escrow arrangement that does not exist"],
  ["held safely", "asserts custody of customer money"],
  ["funds held", "asserts custody of customer money"],
  ["funds are held", "asserts custody of customer money"],
  ["money is held", "asserts custody of customer money"],
  ["payment is held", "asserts custody of customer money"],
  ["payments are held", "asserts custody of customer money"],
  ["held until", "asserts custody for a period"],
  ["we hold your", "asserts custody in the first person"],
  ["stored balance", "describes a stored-value product Vibaar does not operate"],
  ["add money", "describes a stored-value product Vibaar does not operate"],
  ["top up your wallet", "describes a stored-value product Vibaar does not operate"],
  ["withdraw cash", "describes a stored-value product Vibaar does not operate"],
  ["buyer protected", "asserts a buyer-protection scheme with no defined policy"],
  ["buyer protection", "asserts a buyer-protection scheme with no defined policy"],
  ["funds released", "asserts an automatic release Vibaar does not guarantee"],
  ["to keep until", "characterises whose money it is"],
];

const WARNING = [
  ["protected", "positioning claim; the marketing site deliberately does not use it"],
  ["protection", "positioning claim; the marketing site deliberately does not use it"],
];

/**
 * Places a term is legitimately not about money. Each entry is a path
 * fragment plus the terms it may use, so an exemption cannot accidentally
 * widen to every term in the list.
 *
 * Deliberately narrow: `middleware.ts` guards ROUTES, the legal pages are
 * about DATA protection, and `businessStore.ts` is about a stale query. None
 * of them says anything about money.
 */
const EXEMPT = [
  ["src/middleware.ts", ["protected", "protection"]],
  ["app/(marketing)/privacy/page.tsx", ["protected", "protection"]],
  ["app/(marketing)/terms/page.tsx", ["protected", "protection"]],
  ["store/businessStore.ts", ["protected", "protection"]],
];

function exempted(file, term) {
  const normalised = file.split(sep).join("/");
  return EXEMPT.some(([fragment, terms]) => normalised.includes(fragment) && terms.includes(term));
}

/**
 * Replaces comment bodies with spaces, preserving offsets so reported line
 * numbers still point at the real line.
 *
 * It tracks strings as it goes, because `"https://x"` contains `//` and
 * blanking from there would swallow the rest of the line — including a claim
 * sitting after it.
 */
function stripComments(source) {
  const out = Array.from(source);
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (c === "/" && next === "/") {
      let end = i;
      while (end < source.length && source[end] !== "\n") end++;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < source.length) {
        if (source[i] === "\\") { i += 2; continue; }
        if (source[i] === c) { i++; break; }
        i++;
      }
      continue;
    }
    i++;
  }
  return out.join("");
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === ".open-next" || entry === "dist") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      yield full;
    }
  }
}

function scan(roots, cwd) {
  const findings = [];
  for (const root of roots) {
    for (const file of walk(join(cwd, root))) {
      const source = readFileSync(file, "utf8");
      const code = stripComments(source);
      const lines = code.split("\n");
      const rel = relative(cwd, file);

      lines.forEach((line, index) => {
        const haystack = line.toLowerCase();
        for (const [term, reason] of BLOCKING) {
          if (haystack.includes(term) && !exempted(rel, term)) {
            findings.push({ severity: "error", file: rel, line: index + 1, term, reason, text: line.trim() });
          }
        }
        for (const [term, reason] of WARNING) {
          // Word boundary, so `protectedRoute` does not read as prose.
          if (new RegExp(`\\b${term}\\b`).test(haystack) && !exempted(rel, term)) {
            findings.push({ severity: "warn", file: rel, line: index + 1, term, reason, text: line.trim() });
          }
        }
      });
    }
  }
  return findings;
}

function report(findings) {
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warn");

  for (const f of warnings) {
    console.log(`\x1b[33mwarn\x1b[0m  ${f.file}:${f.line}  "${f.term}" — ${f.reason}`);
    console.log(`        ${f.text.slice(0, 120)}`);
  }
  for (const f of errors) {
    console.log(`\x1b[31mERROR\x1b[0m ${f.file}:${f.line}  "${f.term}" — ${f.reason}`);
    console.log(`        ${f.text.slice(0, 120)}`);
  }

  if (errors.length) {
    console.log(
      `\n${errors.length} custody/stored-value claim(s) in user-visible copy.\n` +
        `These are factual claims about whose money it is and where it sits. Replace them\n` +
        `with what the system actually does: the order is tracked, and a seller's earnings\n` +
        `become available after delivery is confirmed.\n`
    );
    return 1;
  }
  console.log(`\x1b[32mok\x1b[0m    no custody or stored-value claims found` +
    (warnings.length ? ` (${warnings.length} warning(s) above)` : ""));
  return 0;
}

/**
 * Plants a violation and asserts the scanner fails on it, then asserts it does
 * NOT fail on the same words inside a comment.
 *
 * This exists because three tests in this repository have already been caught
 * passing vacuously. A lint nobody has seen fail is not known to work.
 */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "copy-claims-"));
  let failures = 0;
  try {
    const deep = join(dir, "apps/web/src/features");
    mkdirSync(deep, { recursive: true });

    writeFileSync(join(deep, "planted.ts"),
      'export const copy = { a: "The money is held safely until delivery." };\n');
    let found = scan(["apps/web/src"], dir);
    if (!found.some((f) => f.severity === "error" && f.term === "held safely")) {
      console.log("SELF-TEST FAIL: a planted custody claim in a string literal was NOT detected");
      failures++;
    }

    writeFileSync(join(deep, "planted.ts"),
      "// Never write: the money is held safely, or escrow, or buyer protection.\n" +
      'export const copy = { a: "Tracked from checkout to delivery." };\n');
    found = scan(["apps/web/src"], dir);
    if (found.some((f) => f.severity === "error")) {
      console.log("SELF-TEST FAIL: banned terms inside a COMMENT were treated as copy —");
      console.log("  this bans the docblock that explains the prohibition");
      failures++;
    }

    writeFileSync(join(deep, "planted.tsx"),
      "export const C = () => <p>Your payment is held until the order arrives.</p>;\n");
    found = scan(["apps/web/src"], dir);
    if (!found.some((f) => f.severity === "error" && f.term === "payment is held")) {
      console.log("SELF-TEST FAIL: a claim in JSX TEXT was not detected");
      failures++;
    }

    if (failures === 0) console.log("\x1b[32mok\x1b[0m    self-test: 3/3 (string literal, comment exemption, JSX text)");
    return failures === 0 ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cwd = process.cwd();
if (process.argv.includes("--self-test")) {
  process.exit(await selfTest());
}
process.exit(report(scan(ROOTS, cwd)));
