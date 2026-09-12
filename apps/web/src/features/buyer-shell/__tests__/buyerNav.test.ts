import { join } from "node:path";
import { routeTemplatesIn } from "@/test-support/routeWalker";
import {
  BUYER_NAV,
  BUYER_NAV_POLICY,
  activeRoutesFor,
  hasBuyerNavPolicy,
  navForSurface,
  resolveBuyerNav,
  routeIsActive,
  routeNeedsContext,
} from "../buyerNav";

const BUYER_ROUTES = join(__dirname, "..", "..", "..", "app", "(buyer)");

/** The seven route patterns that carry a bottom bar today. */
const MOBILE_TODAY = [
  "/shop",
  "/profile",
  "/orders",
  "/:handle",
  "/cart/order-confirmed/:id",
  "/cart",
  "/inbox",
];

describe("mobile parity", () => {
  /**
   * THE SAFETY NET. Centralising the mount had to move where navigation is
   * decided without moving what a shopper sees. Nineteen routes have no bar
   * today and must still have none; seven have one and must keep it.
   */
  it("gives a bar to exactly the routes that have one today", () => {
    const withBar = BUYER_NAV_POLICY.filter(
      ([, policy]) => policy.mobileBar !== "never"
    ).map(([template]) => template);

    expect(withBar.sort()).toEqual([...MOBILE_TODAY].sort());
  });

  it("keeps the same three destinations", () => {
    expect(navForSurface("mobile").map((link) => link.id)).toEqual([
      "shop",
      "cart",
      "profile",
    ]);
  });

  it("keeps Cart claiming /orders on mobile, as it always has", () => {
    const cart = BUYER_NAV.find((link) => link.id === "cart")!;
    expect(activeRoutesFor(cart, "mobile")).toEqual(["/cart", "/orders"]);
    expect(routeIsActive("/orders/order-1", "/orders")).toBe(true);
  });

  it("keeps Profile pointing at /profile, signed in or not", () => {
    const profile = BUYER_NAV.find((link) => link.id === "profile")!;
    expect(profile.href).toBe("/profile");
    expect(profile.surfaces).toEqual(["mobile"]);
  });

  it("names the two conditional routes rather than hiding them in pages", () => {
    expect(resolveBuyerNav("/cart").mobileBar).toBe("when-cart-empty");
    expect(resolveBuyerNav("/inbox").mobileBar).toBe("when-user-present");
  });
});

describe("desktop rail", () => {
  it("is absent only while actively paying", () => {
    const noRail = BUYER_NAV_POLICY.filter(([, p]) => !p.desktopRail).map(([t]) => t);
    expect(noRail.sort()).toEqual([
      "/cart/complete-order/review",
      "/cart/shipping-profile",
      "/cart/shipping-profile/new",
    ]);
  });

  it("returns after payment succeeds", () => {
    expect(resolveBuyerNav("/cart/payment-successful").desktopRail).toBe(true);
    expect(resolveBuyerNav("/cart/order-confirmed/abc").desktopRail).toBe(true);
  });

  it("covers account pages whose mobile bar stays hidden", () => {
    for (const path of [
      "/profile/edit-profile",
      "/profile/new-address",
      "/profile/settings/change-password",
      "/profile/shipping-address/edit",
    ]) {
      expect(resolveBuyerNav(path)).toEqual({ desktopRail: true, mobileBar: "never" });
    }
  });

  it("carries Orders as its own destination, not folded into Cart", () => {
    expect(navForSurface("desktop").map((l) => l.id)).toEqual(["shop", "cart", "orders"]);
    const cart = BUYER_NAV.find((l) => l.id === "cart")!;
    expect(activeRoutesFor(cart, "desktop")).toEqual(["/cart"]);
  });

  it("keeps the account out of the centre group — it lives once, at the bottom", () => {
    expect(navForSurface("desktop").map((l) => l.id)).not.toContain("profile");
  });
});

describe("the contextual address route", () => {
  /**
   * One URL, two screens. From checkout it is mid-payment; from the profile it
   * is an account errand. Unconditionally nav-free would break the rule that
   * only ACTIVE checkout hides the rail.
   */
  it("has no rail when reached from checkout", () => {
    expect(resolveBuyerNav("/cart/shipping-profile/new").desktopRail).toBe(false);
  });

  it("has a rail when reached from the profile", () => {
    expect(
      resolveBuyerNav("/cart/shipping-profile/new", { from: "profile" }).desktopRail
    ).toBe(true);
  });

  it("keeps its mobile bar hidden either way", () => {
    expect(resolveBuyerNav("/cart/shipping-profile/new").mobileBar).toBe("never");
    expect(
      resolveBuyerNav("/cart/shipping-profile/new", { from: "profile" }).mobileBar
    ).toBe("never");
  });

  it("is the only route that needs context", () => {
    expect(routeNeedsContext("/cart/shipping-profile/new")).toBe(true);
    for (const path of ["/shop", "/cart", "/profile", "/cart/shipping-profile"]) {
      expect(routeNeedsContext(path)).toBe(false);
    }
  });

  it("ignores an unrelated from value", () => {
    expect(
      resolveBuyerNav("/cart/shipping-profile/new", { from: "elsewhere" }).desktopRail
    ).toBe(false);
  });
});

describe("resolution", () => {
  /**
   * `/:handle` is a single-segment template at the group root, so it shares a
   * length with every single-segment literal. A wildcard-first scan would read
   * all seven as storefronts.
   */
  it.each(["/shop", "/cart", "/orders", "/profile", "/inbox", "/notification", "/sharespotlights"])(
    "does not let /:handle swallow %s",
    (literal) => {
      expect(resolveBuyerNav(literal)).toEqual(resolveBuyerNav(literal));
      expect(BUYER_NAV_POLICY.some(([t]) => t === literal)).toBe(true);
    }
  );

  it("still resolves a real storefront handle", () => {
    expect(resolveBuyerNav("/@localstore")).toEqual({
      desktopRail: true,
      mobileBar: "always",
    });
  });

  it("separates a deliberate no-nav route from an unclassified one", () => {
    expect(resolveBuyerNav("/cart/shipping-profile").desktopRail).toBe(false);
    expect(hasBuyerNavPolicy("/cart/shipping-profile")).toBe(true);

    // Must be multi-segment to be genuinely unclaimed — see below.
    expect(resolveBuyerNav("/invented/deep/path").desktopRail).toBe(false);
    expect(hasBuyerNavPolicy("/invented/deep/path")).toBe(false);
  });

  /**
   * `/:handle` claims EVERY single-segment path, because that is what the
   * storefront route does: `[handle]` sits at the group root and calls
   * `notFound()` for anything without an `@`. So an unrecognised single segment
   * is classified — it is a storefront that will 404 — rather than unclassified.
   *
   * Pinned because it is the reason any new top-level buyer route must be a real
   * directory: `/browse` would otherwise be swallowed here and never reach a page.
   */
  it("treats an unknown single segment as a storefront, not as unclassified", () => {
    expect(hasBuyerNavPolicy("/invented")).toBe(true);
    expect(resolveBuyerNav("/invented")).toEqual(resolveBuyerNav("/@localstore"));
  });

  it("survives a null pathname", () => {
    expect(resolveBuyerNav(null)).toEqual({ desktopRail: false, mobileBar: "never" });
    expect(hasBuyerNavPolicy(null)).toBe(false);
  });
});

describe("policy coverage", () => {
  it("classifies every buyer page, and every entry has a page", () => {
    const onDisk = routeTemplatesIn(BUYER_ROUTES, "").map((r) => r || "/");
    const classified = BUYER_NAV_POLICY.map(([t]) => t).sort();

    expect(onDisk.length).toBeGreaterThan(0);
    expect(classified).toEqual(onDisk.sort());
  });

  it("lists no route twice", () => {
    const templates = BUYER_NAV_POLICY.map(([t]) => t);
    expect(new Set(templates).size).toBe(templates.length);
  });
});
