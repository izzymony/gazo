import { isSellerHub, activeSellerNav, SELLER_NAV } from "../sellerNav";

describe("isSellerHub", () => {
  // The nav used to be driven by a deny-list of paths to hide it on, so
  // anything not explicitly listed showed a tab bar. That is how the storefront
  // sub-pages — Store Details, Customise, Address, Shipping — ended up with the
  // bar sitting on top of a focused form. The allow-list defaults the other way.
  it("carries the nav on every destination the nav itself links to", () => {
    for (const { route } of SELLER_NAV) {
      expect(isSellerHub(route)).toBe(true);
    }
  });

  it("carries the nav on the hubs reached from a header", () => {
    expect(isSellerHub("/dashboard/inbox")).toBe(true);
    expect(isSellerHub("/dashboard/notification")).toBe(true);
    expect(isSellerHub("/dashboard/storefront")).toBe(true);
  });

  it.each([
    "/dashboard/storefront/details",
    "/dashboard/storefront/customise",
    "/dashboard/storefront/address",
    "/dashboard/storefront/shipping",
    "/dashboard/catalog/product/abc-123",
    "/dashboard/catalog/product/create/manual/new",
    "/dashboard/catalog/discount/new",
    "/dashboard/orders/order-1",
    "/dashboard/inbox/conversation-1",
    "/dashboard/settings/security",
    "/dashboard/wallet",
    "/dashboard/payouts/withdraw",
    "/dashboard/transactions",
  ])("hides the nav on the focused flow %s", (path) => {
    expect(isSellerHub(path)).toBe(false);
  });

  it("matches exactly — a hub's children are not hubs", () => {
    expect(isSellerHub("/dashboard/orders")).toBe(true);
    expect(isSellerHub("/dashboard/orders/")).toBe(true); // trailing slash only
    expect(isSellerHub("/dashboard/orders/1")).toBe(false);
  });

  it("survives a null pathname", () => {
    expect(isSellerHub(null)).toBe(false);
    expect(isSellerHub(undefined)).toBe(false);
    expect(isSellerHub("")).toBe(false);
  });
});

describe("activeSellerNav", () => {
  it("resolves storefront pages to Settings, where they are reached from", () => {
    expect(activeSellerNav("/dashboard/storefront")).toBe("Settings");
    expect(activeSellerNav("/dashboard/storefront/details")).toBe("Settings");
  });

  it("does not let the bare dashboard swallow its children", () => {
    expect(activeSellerNav("/dashboard")).toBe("Home");
    expect(activeSellerNav("/dashboard/catalog")).toBe("Catalog");
  });
});
