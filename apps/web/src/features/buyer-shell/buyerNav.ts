import {
  Home,
  Package,
  PackageSolid,
  ShoppingCart,
  ShoppingCartSolid,
  User,
  type IconProps,
} from "@vibaar/ui/icons";
import type React from "react";
import { createRoutePolicy } from "@/lib/routePolicy";

/** Which representation carries a destination. They are not the same list. */
export type BuyerNavSurface = "mobile" | "desktop";

export type BuyerNavLink = {
  id: string;
  label: string;
  href: string;
  Icon: React.ComponentType<IconProps>;
  /** Filled companion, where the outline does not close on its own. */
  Solid?: React.ComponentType<{ size?: number; className?: string }>;
  surfaces: readonly BuyerNavSurface[];
  /** Routes that mark this destination current, per surface. */
  activeOn: Partial<Record<BuyerNavSurface, readonly string[]>> & {
    readonly default: readonly string[];
  };
};

/**
 * The buyer's destinations, defined once and rendered by both representations.
 *
 * They were a module-private const inside the bottom bar, which is why a rail
 * could not share them: two lists would have drifted on where Cart goes and what
 * marks it current.
 *
 * Cart's active routes differ by surface, and that is deliberate rather than an
 * oversight. On mobile there are three destinations and Cart has always claimed
 * `/orders` as well as `/cart` — changing that would be a mobile product change
 * nobody asked for. On desktop there is room for Orders to own its own route, so
 * it does.
 */
export const BUYER_NAV: readonly BuyerNavLink[] = [
  {
    id: "shop",
    label: "Shop",
    href: "/shop",
    Icon: Home,
    surfaces: ["mobile", "desktop"],
    activeOn: { default: ["/shop"] },
  },
  {
    id: "cart",
    label: "Cart and orders",
    href: "/cart",
    Icon: ShoppingCart,
    Solid: ShoppingCartSolid,
    surfaces: ["mobile", "desktop"],
    activeOn: { default: ["/cart", "/orders"], desktop: ["/cart"] },
  },
  {
    id: "orders",
    label: "Orders",
    href: "/orders",
    Icon: Package,
    Solid: PackageSolid,
    surfaces: ["desktop"],
    activeOn: { default: ["/orders"] },
  },
  {
    id: "profile",
    label: "Profile",
    href: "/profile",
    Icon: User,
    // Mobile only. On the rail the account lives once, in the bottom group —
    // a destination here plus an avatar down there is two controls for one
    // thing, and `/profile` already IS the signed-out account experience.
    surfaces: ["mobile"],
    activeOn: { default: ["/profile"] },
  },
];

export const navForSurface = (surface: BuyerNavSurface) =>
  BUYER_NAV.filter((link) => link.surfaces.includes(surface));

export const activeRoutesFor = (link: BuyerNavLink, surface: BuyerNavSurface) =>
  link.activeOn[surface] ?? link.activeOn.default;

export const routeIsActive = (pathName: string, route: string) =>
  pathName === route || pathName.startsWith(`${route}/`);

/* ------------------------------------------------------------------ policy */

/**
 * Mobile and desktop answer different questions, so the policy carries both.
 *
 * The mobile axis names its runtime conditions rather than hiding them in pages.
 * Centralising the mount has to PRESERVE today's behaviour, not approximate it,
 * and two routes have always been conditional.
 */
export type BuyerMobileNavRule =
  | "always"
  | "never"
  /** `/cart` — keeps the bar clear of its own checkout footer. */
  | "when-cart-empty"
  /** `/inbox` — the signed-out state has its own sign-in screen. */
  | "when-user-present";

export type BuyerNavigationPolicy = {
  readonly desktopRail: boolean;
  readonly mobileBar: BuyerMobileNavRule;
};

const FULL: BuyerNavigationPolicy = { desktopRail: true, mobileBar: "always" };
const RAIL_ONLY: BuyerNavigationPolicy = { desktopRail: true, mobileBar: "never" };
const NO_NAV: BuyerNavigationPolicy = { desktopRail: false, mobileBar: "never" };

/**
 * Every route under `(buyer)`, and what it carries.
 *
 * Mobile is preserved exactly: the seven entries with a bar today keep it, on the
 * same conditions, and the nineteen without gain nothing. Desktop is the axis
 * that changes — a rail throughout, except while actively paying.
 *
 * Exported so a test walks the route directory and compares in both directions:
 * a new page nobody classified fails, and an entry whose page is gone fails.
 */
export const BUYER_NAV_POLICY: ReadonlyArray<
  readonly [template: string, policy: BuyerNavigationPolicy]
> = [
  // Bar today, and keeps it.
  ["/shop", FULL],
  ["/profile", FULL],
  ["/orders", FULL],
  ["/:handle", FULL],
  ["/cart/order-confirmed/:id", FULL],
  ["/cart", { desktopRail: true, mobileBar: "when-cart-empty" }],
  ["/inbox", { desktopRail: true, mobileBar: "when-user-present" }],

  // No bar today, and gains none. The rail is new on all of these.
  ["/:handle/p/:slugAndId", RAIL_ONLY],
  ["/cart/payment-successful", RAIL_ONLY],
  ["/orders/:orderId", RAIL_ONLY],
  ["/inbox/message/:messageId", RAIL_ONLY],
  ["/notification", RAIL_ONLY],
  ["/sharespotlights", RAIL_ONLY],
  ["/shop/recently-viewed", RAIL_ONLY],
  ["/shop/spotlights", RAIL_ONLY],
  ["/profile/edit-profile", RAIL_ONLY],
  ["/profile/new-address", RAIL_ONLY],
  ["/profile/referrals", RAIL_ONLY],
  ["/profile/settings", RAIL_ONLY],
  ["/profile/settings/change-password", RAIL_ONLY],
  ["/profile/shipping-address", RAIL_ONLY],
  ["/profile/shipping-address/edit", RAIL_ONLY],
  ["/profile/support", RAIL_ONLY],

  // Actively paying: the screen is the task.
  ["/cart/shipping-profile", NO_NAV],
  ["/cart/complete-order/review", NO_NAV],

  // Two screens at one URL — see resolveBuyerNav.
  ["/cart/shipping-profile/new", NO_NAV],
];

const POLICY = createRoutePolicy<BuyerNavigationPolicy>(BUYER_NAV_POLICY);

/**
 * `/cart/shipping-profile/new` is an address form reached from two places.
 *
 * From checkout it is mid-payment and carries nothing. From
 * `/profile/shipping-address` it is an account errand — `?from=profile` — and
 * carries the rail like every other account page. Treating it as unconditionally
 * nav-free would break the rule that ONLY active checkout hides the rail.
 *
 * Read from the explicit search parameter, never `document.referrer`. That is
 * not merely unreliable — in the App Router it reflects the DOCUMENT load and is
 * never updated by a client-side `router.push`, so on the very path this exists
 * to catch (in-app profile -> address form) it holds an unrelated URL. It is
 * also empty on a fresh load or a shared link.
 */
const CONTEXTUAL_ROUTE = "/cart/shipping-profile/new";

export const routeNeedsContext = (pathName: string | null | undefined) =>
  Boolean(pathName) && POLICY.has(pathName) && pathName!.replace(/\/$/, "") === CONTEXTUAL_ROUTE;

export type BuyerNavContext = { readonly from?: string | null };

/**
 * The single reading of "this is an account errand, not active checkout".
 *
 * Exported so the shell and the page cannot disagree. They did: the shell
 * resolved nav from `?from` alone while the page ORed in a `document.referrer`
 * check, so the two could reach opposite conclusions on the same render.
 */
export const isAccountContext = (from?: string | null): boolean => from === "profile";

export function resolveBuyerNav(
  pathName: string | null | undefined,
  context: BuyerNavContext = {}
): BuyerNavigationPolicy {
  const base = POLICY.resolve(pathName) ?? NO_NAV;
  if (routeNeedsContext(pathName) && isAccountContext(context.from)) {
    return RAIL_ONLY;
  }
  return base;
}

/** Whether this route was classified, as opposed to merely resolving to no nav. */
export const hasBuyerNavPolicy = (pathName: string | null | undefined) => POLICY.has(pathName);
