import {
  Home,
  Package,
  PackageSolid,
  Store,
  Analytics,
  Settings,
  type IconProps,
} from "@vibaar/ui/icons";
import type React from "react";

export type SellerNavLink = {
  Icon: React.ComponentType<IconProps>;
  /**
   * Filled companion for the selected state. Only the glyphs whose outline
   * paths do not close need one; the rest fill from their own geometry.
   */
  Solid?: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  title: string;
};

/**
 * The seller dashboard's destinations.
 *
 * This array and the matcher below were duplicated verbatim in BottomNav and
 * DesktopNav — the mobile bar and the desktop rail. Adding a dashboard section
 * meant editing both, and a mismatch would have shown one nav highlighting a
 * tab the other did not.
 */
export const SELLER_NAV: SellerNavLink[] = [
  { Icon: Home, route: "/dashboard", title: "Home" },
  { Icon: Package, Solid: PackageSolid, route: "/dashboard/orders", title: "Orders" },
  { Icon: Store, route: "/dashboard/catalog", title: "Catalog" },
  { Icon: Analytics, route: "/dashboard/analytics", title: "Analytics" },
  { Icon: Settings, route: "/dashboard/settings", title: "Settings" },
];

/**
 * Which navigation a route carries.
 *
 *   full          the hubs you switch between — rail and bar
 *   desktop-only  a detail, financial or settings-index page. The bar would
 *                 compete with the page for 60px it cannot spare; the rail sits
 *                 in a gutter the frame reserves anyway, and taking it away is
 *                 what made the page jump on the way in and out.
 *   none          a create or edit flow, deliberately distraction-free
 *
 * The two navs used to share one boolean, which is the whole defect: desktop and
 * mobile were forced to agree when they answer different questions.
 *
 * Classification is per route and explicit. It is NOT derived from the path —
 * `includes("/create")` would miss `…/manual/edit/:productId`, which is nav-free
 * despite being an edit, and a `startsWith("/dashboard/settings/")` rule would
 * wrongly sweep up `settings/billing`, which is an index rather than a form.
 */
export type SellerNavMode = "full" | "desktop-only" | "none";

/**
 * Every route under `(seller)/dashboard`, and what it carries.
 *
 * Exported because a test walks the route directory and compares it with this
 * list in both directions: a new page that nobody classified fails, and an entry
 * whose page has been deleted fails. Without that, an unclassified route would
 * silently fall to the default below and nobody would hear about it.
 */
export const SELLER_NAV_POLICY: ReadonlyArray<readonly [template: string, mode: SellerNavMode]> = [
  // Hubs — rail and bar.
  ["/dashboard", "full"],
  ["/dashboard/orders", "full"],
  ["/dashboard/catalog", "full"],
  ["/dashboard/analytics", "full"],
  ["/dashboard/settings", "full"],
  ["/dashboard/inbox", "full"],
  ["/dashboard/notification", "full"],
  ["/dashboard/storefront", "full"],

  // Detail, financial and settings-index pages — rail only.
  ["/dashboard/orders/:orderId", "desktop-only"],
  ["/dashboard/inbox/:conversationId", "desktop-only"],
  ["/dashboard/catalog/product/:productId", "desktop-only"],
  ["/dashboard/wallet", "desktop-only"],
  ["/dashboard/wallet/settings", "desktop-only"],
  ["/dashboard/payouts", "desktop-only"],
  ["/dashboard/payouts/withdraw", "desktop-only"],
  ["/dashboard/transactions", "desktop-only"],
  ["/dashboard/transactions/summary", "desktop-only"],
  ["/dashboard/settings/billing", "desktop-only"],
  ["/dashboard/settings/security", "desktop-only"],

  // Create and edit flows — neither.
  ["/dashboard/catalog/discount/new", "none"],
  ["/dashboard/catalog/product/create", "none"],
  ["/dashboard/catalog/product/create/manual", "none"],
  ["/dashboard/catalog/product/create/manual/new", "none"],
  ["/dashboard/catalog/product/create/manual/edit/:productId", "none"],
  ["/dashboard/storefront/create", "none"],
  ["/dashboard/storefront/customise", "none"],
  ["/dashboard/storefront/details", "none"],
  ["/dashboard/storefront/address", "none"],
  ["/dashboard/storefront/shipping", "none"],
  ["/dashboard/payouts/addaccount", "none"],
  ["/dashboard/settings/billing/add-card", "none"],
  ["/dashboard/settings/change-password", "none"],
];

/*
 * Resolution is two-pass, and static wins.
 *
 * Segment count alone does not disambiguate. `/dashboard/catalog/product/create`
 * and `/dashboard/catalog/product/:productId` are both five segments, so a plain
 * wildcard scan would read the CREATE FLOW as a product detail page and hand it a
 * rail. Resolving literals from a map first makes that impossible by
 * construction — there is no comparator to get wrong and no tie to break.
 */
const STATIC_POLICY = new Map<string, SellerNavMode>(
  SELLER_NAV_POLICY.filter(([template]) => !template.includes(":"))
);
const DYNAMIC_POLICY = SELLER_NAV_POLICY.filter(([template]) => template.includes(":"));

/** Tolerate a trailing slash; Next does not emit one, but a hand-typed URL can. */
function normalise(pathName: string): string {
  return pathName.length > 1 && pathName.endsWith("/") ? pathName.slice(0, -1) : pathName;
}

function matchDynamic(pathName: string): SellerNavMode | undefined {
  const actual = pathName.split("/");
  for (const [template, mode] of DYNAMIC_POLICY) {
    const expected = template.split("/");
    if (expected.length !== actual.length) continue;
    const hit = expected.every(
      (segment, index) =>
        segment.startsWith(":") ? actual[index].length > 0 : segment === actual[index]
    );
    if (hit) return mode;
  }
  return undefined;
}

/**
 * Whether this route was classified above, as opposed to merely resolving.
 *
 * `sellerNavMode` answers "none" for an unclassified route as well as for a
 * deliberate one, so it cannot tell the two apart — which is exactly what the
 * coverage test needs to do.
 */
export function hasSellerNavPolicy(pathName: string | null | undefined): boolean {
  if (!pathName) return false;
  const path = normalise(pathName);
  return STATIC_POLICY.has(path) || matchDynamic(path) !== undefined;
}

/**
 * What this route carries. Unclassified falls to `none`: a page nobody has
 * thought about should be distraction-free rather than confidently wrong, and
 * the coverage test means it cannot stay unclassified for long.
 */
export function sellerNavMode(pathName: string | null | undefined): SellerNavMode {
  if (!pathName) return "none";
  const path = normalise(pathName);
  return STATIC_POLICY.get(path) ?? matchDynamic(path) ?? "none";
}

/**
 * Which nav entry a path belongs to.
 *
 * Order matters: it is a priority list, not a set of independent tests.
 * `/dashboard/storefront` resolves to Settings because storefront customisation
 * is reached from there, and the bare `/dashboard` check must come last so it
 * cannot swallow its own children.
 */
export function activeSellerNav(pathName: string): string | null {
  if (pathName === "/dashboard/analytics") return "Analytics";
  if (pathName.startsWith("/dashboard/settings") || pathName.startsWith("/dashboard/storefront"))
    return "Settings";
  if (pathName === "/dashboard/orders" || pathName.startsWith("/dashboard/orders/")) return "Orders";
  if (pathName.startsWith("/dashboard/catalog")) return "Catalog";
  if (pathName === "/dashboard") return "Home";
  return null;
}
