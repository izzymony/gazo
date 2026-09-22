#!/usr/bin/env node
/**
 * Is each @vibaar/ui module actually reachable from the product?
 *
 * This lives at the repo root, not in packages/ui, because the question spans
 * workspaces: the library cannot see who imports it. A package-level Jest test
 * asking this would either lie or reach outside its own package.
 *
 * REACHABILITY, NOT DIRECT IMPORTS. A primitive consumed only by another
 * component is still in use — Avatar ships inside StoreLogo and
 * UserProfileImage, and no app file imports Avatar by name. Counting direct
 * importers alone reports three false orphans and teaches everyone to ignore
 * the number. So: seed with what the apps import, then follow intra-library
 * edges until the set stops growing.
 *
 * The playground is excluded on purpose. It is git-ignored and absent from CI,
 * so "the catalogue imports it" is not evidence the product uses it — and on a
 * clean checkout that import does not exist at all.
 *
 * ENFORCES one rule: a `stable` entry with no consumer must say why, via
 * `disposition` (planned | keep | review). Being unused does not make an API
 * unstable — it makes it unexplained.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { uiRegistry } = require(path.join(ROOT, "packages/ui/registry.cjs"));

const APP_ROOTS = ["apps/web/src", "apps/admin/src"];
const LIB_SRC = path.join(ROOT, "packages/ui/src");
const SKIP_DIRS = new Set(["__tests__", "node_modules", "(dev)"]);

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, acc);
    } else if (/\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
};

const ids = uiRegistry.map((e) => e.source);
const basename = (source) => source.split("/").pop();

// Seed: what the applications import by package path.
const direct = new Set();
for (const root of APP_ROOTS) {
  for (const file of walk(path.join(ROOT, root))) {
    const src = fs.readFileSync(file, "utf8");
    for (const id of ids) if (src.includes(`@vibaar/ui/${id}`)) direct.add(id);
  }
}

// Edges: which library module imports which other library module.
const edges = {};
for (const id of ids) {
  const file = [".tsx", ".ts"]
    .map((ext) => path.join(LIB_SRC, id + ext))
    .find((candidate) => fs.existsSync(candidate));
  if (!file) continue;
  const src = fs.readFileSync(file, "utf8");
  edges[id] = ids.filter(
    (other) => other !== id && new RegExp(`["'][./\\w-]*/${basename(other)}["']`).test(src)
  );
}

// Closure.
const reachable = new Set(direct);
for (let grew = true; grew; ) {
  grew = false;
  for (const id of [...reachable])
    for (const dep of edges[id] ?? [])
      if (!reachable.has(dep)) {
        reachable.add(dep);
        grew = true;
      }
}

const shippable = uiRegistry.filter(
  (e) => !["internal", "asset", "deprecated"].includes(e.kind) && !["internal", "deprecated"].includes(e.status)
);

const orphans = shippable.filter((e) => !reachable.has(e.source));
const unexplained = orphans.filter((e) => e.status === "stable" && !e.disposition);

const transitive = shippable.filter((e) => reachable.has(e.source) && !direct.has(e.source));

console.log(`\n  @vibaar/ui adoption — ${shippable.length} shippable modules`);
console.log(`    directly imported by an app : ${shippable.filter((e) => direct.has(e.source)).length}`);
console.log(`    reachable via the library   : ${transitive.length}${transitive.length ? ` (${transitive.map((e) => e.source).join(", ")})` : ""}`);
console.log(`    not reachable at all        : ${orphans.length}${orphans.length ? ` (${orphans.map((e) => `${e.source} [${e.status}${e.disposition ? `/${e.disposition}` : ""}]`).join(", ")})` : ""}`);

if (unexplained.length) {
  console.error(
    `\n  ✗ ${unexplained.length} stable module(s) have no consumer and no disposition.\n` +
      `    Unused does not mean unstable — but it does need an answer. Add a\n` +
      `    fourth field to the registry entry: "planned", "keep" or "review".\n` +
      unexplained.map((e) => `      ${e.source}`).join("\n") +
      "\n"
  );
  process.exit(1);
}

console.log(`\n  Adoption OK — every unadopted stable module carries a disposition.\n`);
