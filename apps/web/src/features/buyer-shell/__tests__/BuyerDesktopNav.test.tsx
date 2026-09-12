import { render, screen, within } from "@testing-library/react";
import BuyerDesktopNav from "../BuyerDesktopNav";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));
jest.mock("../selectors", () => ({ useCartCount: () => 3 }));

let auth = { user: null as unknown, isAuthenticated: false };
let seller = { href: "/signup", isSignedIn: false, hasStore: false };
jest.mock("@/hooks/useAuthSnapshot", () => ({
  useAuthSnapshot: () => auth,
  useSellerDestination: () => seller,
}));

const renderAt = (pathname: string) => {
  mockPathname.mockReturnValue(pathname);
  return render(<BuyerDesktopNav />);
};

beforeEach(() => {
  auth = { user: null, isAuthenticated: false };
  seller = { href: "/signup", isSignedIn: false, hasStore: false };
});

describe("BuyerDesktopNav", () => {
  describe("an overlay, not a column", () => {
    /**
     * The page shows through it: `/shop`'s gradient runs the full width of the
     * viewport underneath. A surface here would cut that in half.
     */
    it("has no background, border or divider of its own", () => {
      const { container } = renderAt("/shop");
      const rail = container.querySelector("nav")!;
      expect(rail.className).not.toMatch(/\bbg-/);
      expect(rail.className).not.toMatch(/\bborder(-|$)/);
      expect(rail.className).not.toMatch(/\bshadow-/);
    });

    it("is desktop-only and fixed to the start edge", () => {
      const { container } = renderAt("/shop");
      const rail = container.querySelector("nav")!;
      expect(rail).toHaveClass("hidden", "lg:flex", "fixed", "start-0", "w-buyer-rail");
    });
  });

  describe("destinations", () => {
    it("carries Shop, Cart and Orders — Orders owns its own route here", () => {
      renderAt("/shop");
      const rail = screen.getByRole("navigation", { name: "Marketplace" });
      const hrefs = within(rail)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href"));
      expect(hrefs).toEqual(
        expect.arrayContaining(["/shop", "/cart", "/orders"])
      );
    });

    it("marks Orders, not Cart, on an order route", () => {
      renderAt("/orders");
      expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(
        screen.getByRole("link", { name: /Cart and orders/ })
      ).not.toHaveAttribute("aria-current");
    });

    it("counts the cart, and announces what the number means", () => {
      renderAt("/shop");
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("items in cart")).toBeInTheDocument();
    });
  });

  describe("the account, exactly once", () => {
    /**
     * A Profile destination above AND an avatar below would be two controls for
     * one place. `/profile` already IS the signed-out account screen, so the one
     * slot simply changes what it says.
     */
    it("keeps Profile out of the destinations", () => {
      renderAt("/shop");
      const rail = screen.getByRole("navigation", { name: "Marketplace" });
      const hrefs = within(rail)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href"));
      expect(hrefs.filter((h) => h === "/profile" || h === "/signin")).toHaveLength(1);
    });

    it("offers sign-in when signed out", () => {
      renderAt("/shop");
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/signin"
      );
      expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
    });

    it("offers the profile when signed in, and still only once", () => {
      auth = { user: { id: "u1" }, isAuthenticated: true };
      renderAt("/shop");
      expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
        "href",
        "/profile"
      );
      expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    });
  });

  describe("the seller switch", () => {
    it("says start selling without a store", () => {
      expect(renderAt("/shop")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Start selling" })).toHaveAttribute(
        "href",
        "/signup"
      );
    });

    it("says switch to selling for an owner", () => {
      auth = { user: { id: "u1" }, isAuthenticated: true };
      seller = { href: "/dashboard", isSignedIn: true, hasStore: true };
      renderAt("/shop");
      expect(screen.getByRole("link", { name: "Switch to selling" })).toHaveAttribute(
        "href",
        "/dashboard"
      );
    });

    it("sends a signed-in user without a store to create one", () => {
      auth = { user: { id: "u1" }, isAuthenticated: true };
      seller = {
        href: "/dashboard/storefront/create?step=1",
        isSignedIn: true,
        hasStore: false,
      };
      renderAt("/shop");
      expect(screen.getByRole("link", { name: "Start selling" })).toHaveAttribute(
        "href",
        "/dashboard/storefront/create?step=1"
      );
    });
  });

  it("names every icon-only control", () => {
    renderAt("/shop");
    const rail = screen.getByRole("navigation", { name: "Marketplace" });
    for (const link of within(rail).getAllByRole("link")) {
      expect(link).toHaveAccessibleName();
    }
  });
});
