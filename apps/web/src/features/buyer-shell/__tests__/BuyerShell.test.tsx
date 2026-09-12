import { render, screen } from "@testing-library/react";
import BuyerShell from "../BuyerShell";

const mockPathname = jest.fn<string, []>();
const mockSearchParams = jest.fn<URLSearchParams, []>();

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}));

let cartGroups = 0;
let hasUser = true;
jest.mock("../selectors", () => ({
  useCartGroupCount: () => cartGroups,
  useCartCount: () => 0,
  useHasUser: () => hasUser,
}));

jest.mock("../BuyerBottomNav", () => ({
  __esModule: true,
  default: () => <div data-testid="bottom-nav" />,
}));

function renderAt(pathname: string, params = "") {
  mockPathname.mockReturnValue(pathname);
  mockSearchParams.mockReturnValue(new URLSearchParams(params));
  return render(
    <BuyerShell>
      <p>page</p>
    </BuyerShell>
  );
}

beforeEach(() => {
  cartGroups = 0;
  hasUser = true;
});

describe("BuyerShell", () => {
  describe("the frame", () => {
    /**
     * `PageShell`'s `main` is `flex-1 overflow-y-auto` inside `h-full` chains,
     * which only engage against a bounded height. Fourteen buyer surfaces depend
     * on it, so the contract survives the shell taking over the mount.
     */
    it("keeps pages bounded, positioned and non-scrolling", () => {
      const { container } = renderAt("/shop");
      const frame = container.firstElementChild!;
      expect(frame).toHaveClass("relative", "h-dvh", "overflow-hidden");
      expect(frame.className).not.toMatch(/overflow-y-(auto|scroll)/);
    });

    /**
     * The rail is an overlay, so the page's full-bleed backdrops must still run
     * edge to edge underneath it. Padding the frame would push `/shop`'s gradient
     * off the screen edge.
     */
    it("applies no padding — only a marker class for foreground clearance", () => {
      const { container } = renderAt("/shop");
      const frame = container.firstElementChild!;
      expect(frame).toHaveClass("buyer-rail-overlay");
      expect(frame.className).not.toMatch(/\bp[lxs]?-/);
    });

    it("drops the marker where there is no rail, so nothing reserves a gutter", () => {
      const { container } = renderAt("/cart/shipping-profile");
      expect(container.firstElementChild).not.toHaveClass("buyer-rail-overlay");
    });
  });

  describe("mobile parity", () => {
    it.each(["/shop", "/profile", "/orders", "/@localstore", "/cart/order-confirmed/x1"])(
      "shows the bar on %s, as it does today",
      (path) => {
        renderAt(path);
        expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
      }
    );

    it.each([
      "/notification",
      "/sharespotlights",
      "/shop/spotlights",
      "/orders/order-1",
      "/profile/edit-profile",
      "/cart/complete-order/review",
      "/@localstore/p/thing-abc123",
    ])("shows no bar on %s, as today", (path) => {
      renderAt(path);
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });

    /**
     * `/cart`'s bar and its own checkout footer are mutually exclusive by
     * construction — the footer renders only with items, the bar only without.
     * That is what keeps them from stacking, so the condition is preserved
     * rather than normalised.
     */
    it("shows /cart's bar only when there are no cart groups", () => {
      cartGroups = 0;
      const empty = renderAt("/cart");
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
      empty.unmount();

      cartGroups = 2;
      renderAt("/cart");
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });

    it("shows /inbox's bar only when a user object is present", () => {
      hasUser = true;
      const signedIn = renderAt("/inbox");
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
      signedIn.unmount();

      hasUser = false;
      renderAt("/inbox");
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });

    /**
     * The storefront's bar used to be suppressed by an `isOwnerView` prop,
     * because the same component renders under `/dashboard/storefront`. The
     * route-group boundary replaces that: the seller render never reaches this
     * shell, so inside it the storefront is unconditional.
     */
    it("shows the storefront bar unconditionally — no owner-view prop", () => {
      renderAt("/@localstore");
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });
  });

  describe("the contextual address route", () => {
    it("has no rail from checkout", () => {
      const { container } = renderAt("/cart/shipping-profile/new");
      expect(container.firstElementChild).not.toHaveClass("buyer-rail-overlay");
    });

    it("has a rail from the profile", () => {
      const { container } = renderAt("/cart/shipping-profile/new", "from=profile");
      expect(container.firstElementChild).toHaveClass("buyer-rail-overlay");
    });

    it("keeps the bar hidden either way", () => {
      renderAt("/cart/shipping-profile/new", "from=profile");
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });
  });

  it("renders its children in every case", () => {
    renderAt("/cart/shipping-profile/new", "from=profile");
    expect(screen.getByText("page")).toBeInTheDocument();
  });
});
