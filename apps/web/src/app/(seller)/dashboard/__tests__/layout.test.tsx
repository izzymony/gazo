import { render, screen } from "@testing-library/react";
import DashboardLayout from "../layout";

const mockPathname = jest.fn<string, []>();

jest.mock("next/navigation", () => ({
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

  it("shows the nav on a hub", () => {
    renderAt("/dashboard/catalog");
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-nav")).toBeInTheDocument();
  });

  it.each([
    "/dashboard/storefront/details",
    "/dashboard/catalog/product/abc-123",
    "/dashboard/orders/order-1",
  ])("hides the nav on the focused flow %s", (path) => {
    renderAt(path);
    expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
    expect(screen.queryByTestId("desktop-nav")).not.toBeInTheDocument();
  });
});
