import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  SELLER_NAV,
  SELLER_NAV_POLICY,
  activeSellerNav,
  hasSellerNavPolicy,
  sellerNavMode,
} from "../sellerNav";

const DASHBOARD_ROUTES = join(__dirname, "..", "..", "..", "app", "(seller)", "dashboard");

/** Every route that actually exists on disk, as a policy template. */
function routeTemplatesOnDisk(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Route groups and private folders do not contribute a URL segment; the
        // dashboard has none today, but Next allows them and a silent miss here
        // would look like an unclassified route.
        if (entry.name.startsWith("(") || entry.name.startsWith("_")) continue;
        walk(path);
      } else if (entry.name === "page.tsx") {
        const rel = relative(DASHBOARD_ROUTES, dir);
        const segments = rel === "" ? [] : rel.split(sep);
        found.push(
          "/dashboard" +
            segments
              .map((s) => "/" + (s.startsWith("[") ? ":" + s.slice(1, -1) : s))
              .join("")
        );
      }
    }
  };
  walk(DASHBOARD_ROUTES);
  return found.sort();
}

describe("sellerNavMode", () => {
  it("carries both navs on every destination the nav itself links to", () => {
    for (const { route } of SELLER_NAV) {
      expect(sellerNavMode(route)).toBe("full");
    }
  });

  it("carries both navs on the hubs reached from a header", () => {
    expect(sellerNavMode("/dashboard/inbox")).toBe("full");
    expect(sellerNavMode("/dashboard/notification")).toBe("full");
    expect(sellerNavMode("/dashboard/storefront")).toBe("full");
  });

  it.each([
    "/dashboard/orders/order-1",
    "/dashboard/inbox/conversation-1",
    "/dashboard/catalog/product/abc-123",
    "/dashboard/wallet",
    "/dashboard/wallet/settings",
    "/dashboard/payouts",
    "/dashboard/payouts/withdraw",
    "/dashboard/transactions",
    "/dashboard/transactions/summary",
    "/dashboard/settings/billing",
    "/dashboard/settings/security",
    "/dashboard/storefront/details",
    "/dashboard/storefront/customise",
    "/dashboard/storefront/address",
    "/dashboard/storefront/shipping",
  ])("keeps the rail and drops the bar on %s", (path) => {
    expect(sellerNavMode(path)).toBe("desktop-only");
  });

  it.each([
    "/dashboard/catalog/discount/new",
    "/dashboard/catalog/product/create",
    "/dashboard/catalog/product/create/manual",
    "/dashboard/catalog/product/create/manual/new",
    "/dashboard/catalog/product/create/manual/edit/abc-123",
    "/dashboard/storefront/create",
    "/dashboard/payouts/addaccount",
    "/dashboard/settings/billing/add-card",
    "/dashboard/settings/change-password",
  ])("drops both navs on %s", (path) => {
    expect(sellerNavMode(path)).toBe("none");
  });

  /**
   * The boundary is the interaction, not the URL depth or the hub you arrived
   * from — which is the thing an eye skimming the policy will get wrong. Each
   * pair below sits under one parent, one segment apart, on opposite sides.
   */
  describe("amending what exists keeps the rail; adding something new does not", () => {
    it.each([
      ["/dashboard/settings/billing", "/dashboard/settings/billing/add-card"],
      ["/dashboard/payouts", "/dashboard/payouts/addaccount"],
      ["/dashboard/settings/security", "/dashboard/settings/change-password"],
      ["/dashboard/catalog/product/abc-123", "/dashboard/catalog/product/create"],
    ])("%s keeps it, %s does not", (keeps, drops) => {
      expect(sellerNavMode(keeps)).toBe("desktop-only");
      expect(sellerNavMode(drops)).toBe("none");
    });

    // Reached through Settings and four segments deep, but they change a field
    // on a store that already exists rather than starting a new thing.
    it.each([
      "/dashboard/storefront/details",
      "/dashboard/storefront/customise",
      "/dashboard/storefront/address",
      "/dashboard/storefront/shipping",
    ])("%s edits in place, so it keeps the rail", (path) => {
      expect(sellerNavMode(path)).toBe("desktop-only");
    });

    it("but creating the storefront itself does not", () => {
      expect(sellerNavMode("/dashboard/storefront/create")).toBe("none");
    });
  });

  /**
   * THE COLLISION. `/dashboard/catalog/product/create` and
   * `/dashboard/catalog/product/:productId` are both five segments, so a matcher
   * that only compares segment counts reads the create flow as a product detail
   * page and hands a distraction-free form a navigation rail. Literals resolve
   * before patterns; these pin that they still do.
   */
  describe("a literal route is never swallowed by a parameter beside it", () => {
    it("keeps product/create nav-free", () => {
      expect(sellerNavMode("/dashboard/catalog/product/create")).toBe("none");
    });

    it("still resolves a real product id to the detail page", () => {
      expect(sellerNavMode("/dashboard/catalog/product/abc-123")).toBe("desktop-only");
      expect(sellerNavMode("/dashboard/catalog/product/create-something")).toBe("desktop-only");
    });

    it("keeps the deeper create flow nav-free too", () => {
      expect(sellerNavMode("/dashboard/catalog/product/create/manual/new")).toBe("none");
      expect(sellerNavMode("/dashboard/catalog/product/create/manual/edit/abc-123")).toBe("none");
    });
  });

  it("matches exactly — a hub's children are not the hub", () => {
    expect(sellerNavMode("/dashboard/orders")).toBe("full");
    expect(sellerNavMode("/dashboard/orders/")).toBe("full"); // trailing slash only
    expect(sellerNavMode("/dashboard/orders/1")).toBe("desktop-only");
  });

  it("falls to none for an unknown path, and survives a null one", () => {
    expect(sellerNavMode("/dashboard/not-a-page")).toBe("none");
    expect(sellerNavMode(null)).toBe("none");
    expect(sellerNavMode(undefined)).toBe("none");
    expect(sellerNavMode("")).toBe("none");
  });
});

describe("hasSellerNavPolicy", () => {
  /**
   * `sellerNavMode` answers "none" for a deliberate create flow AND for a route
   * nobody classified, so it cannot tell them apart. This can, which is what
   * makes the coverage test below mean anything.
   */
  it("separates a classified none from an unclassified one", () => {
    expect(sellerNavMode("/dashboard/settings/change-password")).toBe("none");
    expect(hasSellerNavPolicy("/dashboard/settings/change-password")).toBe(true);

    expect(sellerNavMode("/dashboard/invented")).toBe("none");
    expect(hasSellerNavPolicy("/dashboard/invented")).toBe(false);
  });

  it("recognises a parameterised route", () => {
    expect(hasSellerNavPolicy("/dashboard/orders/order-1")).toBe(true);
    expect(hasSellerNavPolicy(null)).toBe(false);
  });
});

describe("policy coverage", () => {
  /**
   * The guard that keeps this honest. A new page under (seller)/dashboard would
   * otherwise fall to the unclassified default and quietly render the wrong
   * navigation; a deleted page would leave an entry nobody notices. Both
   * directions are asserted, so neither can happen silently.
   */
  it("classifies every dashboard page, and every entry has a page", () => {
    const onDisk = routeTemplatesOnDisk();
    const classified = SELLER_NAV_POLICY.map(([template]) => template).sort();

    expect(onDisk.length).toBeGreaterThan(0); // the walk itself must not silently find nothing
    expect(classified).toEqual(onDisk);
  });

  it("lists no route twice", () => {
    const templates = SELLER_NAV_POLICY.map(([template]) => template);
    expect(new Set(templates).size).toBe(templates.length);
  });
});

describe("activeSellerNav", () => {
  // Unchanged by the visibility work, and deliberately so: a rail with no tab
  // lit is the honest rendering for a route that is not one of its five
  // destinations. Pinned here so that stays a decision rather than a drift.
  it("resolves a hub and its children to the same destination", () => {
    expect(activeSellerNav("/dashboard/orders")).toBe("Orders");
    expect(activeSellerNav("/dashboard/orders/order-1")).toBe("Orders");
    expect(activeSellerNav("/dashboard/catalog/product/abc")).toBe("Catalog");
    expect(activeSellerNav("/dashboard/storefront/details")).toBe("Settings");
    expect(activeSellerNav("/dashboard/settings/change-password")).toBe("Settings");
  });

  it("lights nothing where the route is not a rail destination", () => {
    for (const path of ["/dashboard/wallet", "/dashboard/payouts", "/dashboard/transactions"]) {
      expect(activeSellerNav(path)).toBeNull();
    }
  });
});
