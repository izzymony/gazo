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
import { createRoutePolicy } from "@/lib/routePolicy";

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
 *   desktop-only  anything you read or amend in place: a detail page, a listing,
 *                 an overview, a settings form that edits what is already there.
 *                 The bar would compete with the page for 60px it cannot spare;
 *                 the rail sits in a gutter the frame reserves anyway, and taking
 *                 it away is what made the page jump on the way in and out.
 *   none          adding a new thing, or an edit serious enough to want the
 *                 screen to itself — deliberately distraction-free
 *
 * The line is the interaction, not the URL depth or which hub you arrived from.
 * `storefront/details` is reached through Settings and is four segments deep, but
 * it changes a field on a store that already exists, so it keeps the rail;
 * `settings/billing/add-card` sits beside a page that keeps the rail and does not,
 * because adding a card is its own errand. "Critical" covers the two edits you
 * would not want to fumble halfway through — a password, and a live product.
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

  // Storefront settings — these amend a store that already exists rather than
  // starting something new, so they read as pages you edit in place, not as
  // flows you enter and leave.
  ["/dashboard/storefront/details", "desktop-only"],
  ["/dashboard/storefront/customise", "desktop-only"],
  ["/dashboard/storefront/address", "desktop-only"],
  ["/dashboard/storefront/shipping", "desktop-only"],

  // Adding something new — neither nav.
  ["/dashboard/catalog/discount/new", "none"],
  ["/dashboard/catalog/product/create", "none"],
  ["/dashboard/catalog/product/create/manual", "none"],
  ["/dashboard/catalog/product/create/manual/new", "none"],
  ["/dashboard/storefront/create", "none"],
  ["/dashboard/payouts/addaccount", "none"],
  ["/dashboard/settings/billing/add-card", "none"],

  // Edits that want the screen to themselves.
  ["/dashboard/catalog/product/create/manual/edit/:productId", "none"],
  ["/dashboard/settings/change-password", "none"],
];

/*
 * Resolution is delegated to the shared matcher, which resolves literals before
 * patterns. That ordering is load-bearing here: `/dashboard/catalog/product/create`
 * and `/dashboard/catalog/product/:productId` are both five segments, so a plain
 * wildcard scan reads the CREATE FLOW as a product detail page and hands a
 * distraction-free form a navigation rail.
 */
const POLICY = createRoutePolicy<SellerNavMode>(SELLER_NAV_POLICY);

/**
 * Whether this route was classified above, as opposed to merely resolving.
 *
 * `sellerNavMode` answers "none" for an unclassified route as well as for a
 * deliberate one, so it cannot tell the two apart — which is exactly what the
 * coverage test needs to do.
 */
export function hasSellerNavPolicy(pathName: string | null | undefined): boolean {
  return POLICY.has(pathName);
}

/**
 * What this route carries. Unclassified falls to `none`: a page nobody has
 * thought about should be distraction-free rather than confidently wrong, and
 * the coverage test means it cannot stay unclassified for long.
 */
export function sellerNavMode(pathName: string | null | undefined): SellerNavMode {
  return POLICY.resolve(pathName) ?? "none";
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
