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
 * The routes that CARRY the nav — the navigable hubs.
 *
 * This used to be expressed the other way round, as a list of paths to hide the
 * nav on, maintained by hand in the dashboard layout. A deny-list defaults to
 * showing, so every sub-page ever added arrived with a tab bar on it until
 * someone noticed: `/dashboard/storefront/details` (and customise, address and
 * shipping beside it) shipped with the bar sitting on top of a focused form.
 *
 * An allow-list defaults the other way. A hub is a destination you switch
 * between; everything deeper is a focused flow you finish and back out of, so
 * matching is EXACT — `/dashboard/orders` is a hub, `/dashboard/orders/{id}` is
 * not. The five nav destinations are the source, plus the three hubs reachable
 * from a header rather than the bar.
 */
const SELLER_HUBS = new Set<string>([
  ...SELLER_NAV.map((item) => item.route),
  "/dashboard/inbox",
  "/dashboard/notification",
  "/dashboard/storefront",
]);

export function isSellerHub(pathName: string | null | undefined): boolean {
  if (!pathName) return false;
  // Tolerate a trailing slash; Next does not emit one, but a hand-typed URL can.
  const normalised =
    pathName.length > 1 && pathName.endsWith("/") ? pathName.slice(0, -1) : pathName;
  return SELLER_HUBS.has(normalised);
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
