import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP = join(__dirname, "..", "..", "..", "app");
const SELLER_NAVS = /seller-shell\/(BottomNav|DesktopNav)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // The playground documents the navs rather than mounting them, and is
      // excluded from production builds anyway.
      return entry.name === "(dev)" || entry.name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const importsSellerNav = (file: string) => SELLER_NAVS.test(readFileSync(file, "utf8"));
const asRoute = (file: string) => relative(APP, file).split(sep).join("/");

/**
 * Seller navigation belongs to the seller shell and nowhere else.
 *
 * Auth, account verification and store onboarding must never show it: a
 * half-registered user has nothing to navigate to, and onboarding is a single
 * linear flow. Today that holds structurally — those routes live outside
 * `(seller)/dashboard`, so they never reach its layout — and that is worth
 * keeping true as the app grows.
 *
 * The invariant is about MOUNTING, deliberately. It does not assert that these
 * route groups have no layout of their own: they may well gain one for their own
 * reasons, and a test that failed on that would be reporting a change rather than
 * a regression.
 */
describe("seller navigation boundary", () => {
  const mounts = sourceFiles(APP).filter(importsSellerNav).map(asRoute);

  it("is mounted in exactly one place — the seller dashboard shell", () => {
    expect(mounts).toEqual(["(seller)/dashboard/layout.tsx"]);
  });

  it.each(["(auth)", "(account)", "(buyer)", "(marketing)", "(seller)/setup"])(
    "never reaches %s",
    (group) => {
      expect(mounts.filter((route) => route.startsWith(group))).toEqual([]);
    }
  );
});
