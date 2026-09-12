import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SRC = join(__dirname, "..", "..", "..");
/**
 * An import of one of the shell's own nav modules.
 *
 * Matched by resolved location rather than by bare name: `marketing-v2` has its
 * own unrelated `BuyerRail` (a scrolling product rail), so a name-only pattern
 * reports a false mount on a marketing section.
 */
const BUYER_NAVS = /(BuyerBottomNav|BuyerDesktopNav)/;
const importsBuyerNav = (file: string, source: string) => {
  const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
  return specifiers.some(
    (spec) =>
      BUYER_NAVS.test(spec) &&
      (spec.includes("buyer-shell/") ||
        (spec.startsWith(".") && file.includes(`${sep}buyer-shell${sep}`)))
  );
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // The playground documents components rather than mounting them, and is
      // excluded from production builds anyway.
      return entry.name === "(dev)" || entry.name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/**
 * Buyer navigation belongs to the buyer shell and nowhere else.
 *
 * It was mounted by eight page-level call sites, which is the single cause of
 * every inconsistency this work removed: navigation on seven of twenty-six
 * routes, two pages carrying their own visibility conditions, and a prop
 * suppressing a duplicate bar on the seller side. Nothing stops that returning
 * except a test.
 */
describe("buyer navigation boundary", () => {
  const mounts = sourceFiles(SRC)
    .filter((file) => importsBuyerNav(file, readFileSync(file, "utf8")))
    .map((file) => relative(SRC, file).split(sep).join("/"));

  it("is mounted only by the shell", () => {
    expect(mounts).toEqual(["features/buyer-shell/BuyerShell.tsx"]);
  });

  it("is never mounted by a page", () => {
    expect(mounts.filter((f) => f.startsWith("app/"))).toEqual([]);
  });

  /** The old name said the opposite of what it was — the BUYER's nav. */
  it("leaves no VendorNav behind", () => {
    const stragglers = sourceFiles(SRC).filter((file) =>
      /VendorNav/.test(readFileSync(file, "utf8"))
    );
    expect(stragglers).toEqual([]);
  });
});
