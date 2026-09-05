const { readdirSync } = require("node:fs");
const { join, relative, resolve } = require("node:path");
const { uiRegistry } = require("../registry.cjs");

const sourceRoot = resolve(__dirname, "..", "src");

function sourceModules(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceModules(path);
    }
    if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".test.tsx")) return [];
    return [relative(sourceRoot, path).replaceAll("\\", "/").replace(/\.tsx$/, "")];
  });
}

const source = new Set(sourceModules(sourceRoot));
const registered = new Set(uiRegistry.map((entry) => entry.source));
const missing = [...source].filter((name) => !registered.has(name)).sort();
const stale = [...registered].filter((name) => !source.has(name)).sort();

if (missing.length || stale.length || registered.size !== uiRegistry.length) {
  if (missing.length) console.error(`Missing registry entries: ${missing.join(", ")}`);
  if (stale.length) console.error(`Stale registry entries: ${stale.join(", ")}`);
  if (registered.size !== uiRegistry.length) console.error("Duplicate registry entries found.");
  process.exit(1);
}

console.log(`UI registry complete: ${registered.size} source modules classified.`);
