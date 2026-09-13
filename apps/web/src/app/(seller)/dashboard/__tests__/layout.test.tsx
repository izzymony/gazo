import { render, screen } from "@testing-library/react";
import DashboardLayout from "../layout";

const mockPathname = jest.fn<string, []>();

jest.mock("next/navigation", () => ({
  // The layout reads the `children` slot's segments, not the URL — see the
  // comment in layout.tsx. The mock keeps taking a path so every existing case
  // reads unchanged, and splits it the way the real hook would.
  useSelectedLayoutSegments: () =>
    mockPathname().replace(/^\/dashboard\/?/, "").split("/").filter(Boolean),
  usePathname: () => mockPathname(),
}));

// The layout's data fetcher hits every seller store on mount; the frame is what
// is under test, so it is stubbed down to a passthrough.
jest.mock("../fectproducts", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/seller-shell/BottomNav", () => ({
  __esModule: true,
  default: () => <div data-testid="bottom-nav" />,
}));

jest.mock("@/features/seller-shell/DesktopNav", () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-nav" />,
}));

function renderAt(pathname: string) {
  mockPathname.mockReturnValue(pathname);
  return render(
    <DashboardLayout>
      <p>page</p>
    </DashboardLayout>
  );
}

describe("seller dashboard frame", () => {
  /**
   * THE REGRESSION. One div was `relative` and `overflow-y-scroll` at once, over
   * a max-width wrapper with no height. Two consequences, and between them they
   * account for most of what looked like a dozen separate seller-side bugs:
   *
   *  - no height below the frame meant every page's own `h-full` scroll region
   *    resolved to `auto`, so `scrollTop` stayed 0 and the collapse-on-scroll
   *    headers never fired and no `sticky` element had any travel;
   *  - being the scroller AND the only positioned ancestor meant `absolute`
   *    children resolved against a box as tall as all the content, so the
   *    product page's action bar scrolled up into the middle of the page.
   *
   * Buyer routes get this right (`relative h-dvh w-full overflow-hidden`), which
   * is why the very same components worked there and not here.
   */
  it("gives pages a bounded, positioned, NON-scrolling box", () => {
    const { container } = renderAt("/dashboard/catalog");

    const pageBox = screen.getByText("page").parentElement!;
    expect(pageBox).toHaveClass("relative", "overflow-hidden", "flex-1", "min-h-0");
    expect(pageBox.className).not.toMatch(/overflow-y-(scroll|auto)/);

    // …inside a column that is exactly the viewport tall.
    const frame = container.querySelector(".h-dvh")!;
    expect(frame).toBeInTheDocument();
    expect(frame.className).not.toMatch(/overflow-y-(scroll|auto)/);
    expect(frame).toContainElement(pageBox);
  });

  it("puts the bottom nav in flow after the page box, not over it", () => {
    renderAt("/dashboard/catalog");

    const nav = screen.getByTestId("bottom-nav");
    const pageBox = screen.getByText("page").parentElement!;
    // Siblings, in that order: the frame column subtracts the nav's height, so
    // no page has to guess it with a bottom margin (it was written as a magic
    // `mb-[60px]` in four separate places).
    expect(nav.previousElementSibling).toBe(pageBox);
  });

  describe("navigation visibility", () => {
    /**
     * The defect this replaced: ONE boolean gated both navs, so walking from a
     * hub into a detail page took the desktop rail away with the mobile bar.
     * The rail sits in a gutter the frame reserves anyway, so removing it bought
     * nothing and made the page jump. They are separate questions now.
     */
    it("carries both on a hub", () => {
      renderAt("/dashboard/catalog");
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
      expect(screen.getByTestId("desktop-nav")).toBeInTheDocument();
    });

    it.each([
      "/dashboard/orders/order-1",
      "/dashboard/catalog/product/abc-123",
      "/dashboard/wallet",
      "/dashboard/settings/billing",
      "/dashboard/storefront/details",
    ])("keeps the rail and drops the bar on %s", (path) => {
      renderAt(path);
      expect(screen.getByTestId("desktop-nav")).toBeInTheDocument();
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });

    it.each([
      "/dashboard/catalog/product/create",
      "/dashboard/catalog/discount/new",
      "/dashboard/settings/billing/add-card",
    ])("drops both on %s", (path) => {
      renderAt(path);
      expect(screen.queryByTestId("desktop-nav")).not.toBeInTheDocument();
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });

    // Editing is as focused as creating. The route says "edit", not "create",
    // which is why the policy names routes instead of matching on the word.
    it("drops both on the product edit flow", () => {
      renderAt("/dashboard/catalog/product/create/manual/edit/abc-123");
      expect(screen.queryByTestId("desktop-nav")).not.toBeInTheDocument();
      expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    });
  });

  describe("the rail's gutter", () => {
    /**
     * The rail is `fixed`, so the frame's padding is the only thing holding a
     * column open for it. The two were independent — padding unconditional,
     * rail gated — so every nav-free route indented 256px for a rail that was
     * never drawn. One flag drives both now, in both directions.
     */
    it.each(["/dashboard/catalog", "/dashboard/orders/order-1"])(
      "reserves the gutter wherever the rail is drawn (%s)",
      (path) => {
        const { container } = renderAt(path);
        expect(screen.getByTestId("desktop-nav")).toBeInTheDocument();
        expect(container.querySelector(".h-dvh")).toHaveClass("pl-shell-inset");
      }
    );

    it("reserves nothing where the rail is not drawn", () => {
      const { container } = renderAt("/dashboard/catalog/product/create");
      expect(screen.queryByTestId("desktop-nav")).not.toBeInTheDocument();
      expect(container.querySelector(".h-dvh")).not.toHaveClass("pl-shell-inset");
    });

    /**
     * The same flag also declares the inset a viewport-fixed descendant needs to
     * clear the rail — PageShell's action bar reads it. A create flow has no
     * rail, so it must not declare one, or its action bar would indent past a
     * rail that is not there.
     */
    it("declares the fixed-element inset only alongside a rail", () => {
      const withRail = renderAt("/dashboard/orders/order-1");
      expect(withRail.container.querySelector(".h-dvh")).toHaveClass("shell-inset-rail");
      withRail.unmount();

      const without = renderAt("/dashboard/catalog/product/create");
      expect(without.container.querySelector(".h-dvh")).not.toHaveClass("shell-inset-rail");
    });
  });
});

/**
 * An intercepted navigation changes the URL while the page underneath stays put.
 * The chrome must follow the page, not the URL — otherwise opening the
 * change-password dialog over the settings list resolves that route's own `none`
 * policy, and the rail disappears from a page the seller is still looking at.
 *
 * Guarded here rather than left to the browser because it is invisible until you
 * open a dialog on the one route group that has a rail, and it will apply to all
 * six dialog families.
 */
describe("chrome during an intercepted navigation", () => {
  it("reads the children slot, so a modal's URL cannot take the rail away", () => {
    // The real hook reports the `children` tree, which interception leaves
    // alone: the URL says change-password, these segments still say security.
    mockPathname.mockReturnValue("/dashboard/settings/security");
    const { container } = render(<DashboardLayout>page</DashboardLayout>);
    expect(container.querySelector(".h-dvh")).toHaveClass("shell-inset-rail");
  });

  it("still drops the rail on the canonical full-page route", () => {
    mockPathname.mockReturnValue("/dashboard/settings/change-password");
    const { container } = render(<DashboardLayout>page</DashboardLayout>);
    expect(container.querySelector(".h-dvh")).not.toHaveClass("shell-inset-rail");
  });
});
