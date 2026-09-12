import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { uiRegistry } = require("../../registry.cjs");

const SRC = join(__dirname, "..");

/** Every module that has a test file of its own, from every __tests__ dir. */
const testedBasenames = (): Set<string> => {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const m = name.match(/^(.+)\.test\.tsx?$/);
      if (m) out.add(m[1].toLowerCase());
    }
  };
  walk(SRC);
  return out;
};

const basename = (source: string) => source.split("/").pop()!.toLowerCase();

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

  /**
   * THE CLAIM THIS MAKES CHECKABLE. "stable" used to mean a specimen AND
   * adoption AND a test suite — three claims wearing one word, none of them
   * verified, and 17 entries carried it with no test file at all.
   *
   * It now means one thing this package can prove on a clean checkout: the API
   * is settled, and there is a test file to catch it changing. Adoption is a
   * separate, derived fact (scripts/check-ui-adoption.cjs) and a specimen is
   * deliberately not required — the playground is git-ignored and absent from
   * CI, so a rating that depended on it could never be verified here.
   */
  it("lets nothing call itself stable without a test file", () => {
    const tested = testedBasenames();
    const unproven = uiRegistry
      .filter((e: { status?: string }) => e.status === "stable")
      .map((e: { source: string }) => e.source)
      .filter((source: string) => !tested.has(basename(source)));
    expect(unproven).toEqual([]);
  });

  // Named hasTestFile, not "tested", for a reason: this asserts a file exists.
  // Whether that file covers anything meaningful is a review question, and
  // pretending otherwise is how the previous claim rotted.
  it("only uses dispositions the policy defines", () => {
    const bad = uiRegistry
      .filter((e: { disposition?: string }) => e.disposition !== undefined)
      .filter((e: { disposition?: string }) => !["planned", "keep", "review"].includes(e.disposition!));
    expect(bad).toEqual([]);
  });

  // A disposition answers "why does this settled API have no consumer yet".
  // On anything but a stable entry it is noise, and noise is how a field stops
  // being read.
  it("puts a disposition only on stable entries", () => {
    const misplaced = uiRegistry
      .filter((e: { disposition?: string; status?: string }) => e.disposition && e.status !== "stable")
      .map((e: { source: string }) => e.source);
    expect(misplaced).toEqual([]);
  });
});
