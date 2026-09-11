import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { uiRegistry } = require("../../registry.cjs");

const SRC = join(__dirname, "..");

/** Every source file the package ships, as a registry-style `source` id. */
const sourceIds = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === "__tests__") continue;
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(name)) continue;
      if (/\.d\.ts$/.test(name)) continue;
      out.push(relative(SRC, full).replace(/\.(tsx|ts)$/, ""));
    }
  };
  walk(SRC);
  return out;
};

/**
 * The registry is the package's declared surface — what exists, and whether it
 * has been signed off. Nothing enforced that it matched the source tree, so it
 * drifted the moment components were added: four (StarRating, ReviewCard,
 * DropdownSelect, AppToaster) shipped in one session and none were listed, so
 * the library's own inventory, the playground's coverage number and the
 * "42/42 stable" claim were all quietly wrong.
 *
 * A registry nobody checks is a document, not a contract.
 */
describe("uiRegistry", () => {
  it("lists every file the package ships", () => {
    const declared = new Set(uiRegistry.map((e: { source: string }) => e.source));
    const missing = sourceIds().filter((id) => !declared.has(id));
    expect(missing).toEqual([]);
  });

  it("lists nothing that no longer exists", () => {
    const actual = new Set(sourceIds());
    const stale = uiRegistry
      .map((e: { source: string }) => e.source)
      .filter((id: string) => !actual.has(id));
    expect(stale).toEqual([]);
  });

  it("gives every entry a status", () => {
    const bad = uiRegistry.filter(
      (e: { source: string; status?: string }) =>
        !["stable", "candidate", "internal", "deprecated"].includes(e.status ?? "")
    );
    expect(bad).toEqual([]);
  });
});
