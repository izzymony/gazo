import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MarketplaceHeader from "../MarketplaceHeader";

const CATEGORIES = [
  { id: "1", name: "Fashion" },
  { id: "2", name: "Beauty" },
];

const setup = (props: Partial<React.ComponentProps<typeof MarketplaceHeader>> = {}) =>
  render(
    <MarketplaceHeader
      searchValue=""
      onSearchChange={() => {}}
      categories={CATEGORIES}
      interval={0}
      {...props}
    />
  );

describe("MarketplaceHeader", () => {
  describe("the mark", () => {
    /**
     * THE REGRESSION THIS GUARDS. The shipped band drew the OLD Instashop logo:
     * the same path data as the dead public/instashop.svg, hand-inlined into
     * HeaderSlides and recoloured from the old pink to var(--brand). Recolouring is
     * why every colour gate passed it. Nothing here may draw brand geometry —
     * it has to come from a file in public/brand/.
     */
    it("draws no inline brand geometry — the mark comes from public/brand", () => {
      const { container } = setup();
      const inlinePaths = container.querySelectorAll("svg path");
      inlinePaths.forEach((path) => {
        const d = path.getAttribute("d") ?? "";
        // The old mark's paths are hundreds of characters of curve data. Icon
        // glyphs from the icon set are fine; a re-drawn logo is not.
        expect(d.length).toBeLessThan(400);
      });
    });

    it("sources the watermark from the brand directory", () => {
      const { container } = setup();
      const watermark = container.querySelector('img[src*="icon-watermark"]');
      expect(watermark).not.toBeNull();
      // Decorative: the headline beside it already says everything it says.
      expect(watermark).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("search", () => {
    // The shipped header mounts SearchInput twice — once for `!isScrolled` and
    // once for `search && isScrolled` — so which one you get depends on scroll.
    it("puts exactly one search field in the tree", () => {
      setup();
      expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    });

    it("keeps the search when the band is collapsed", () => {
      setup({ collapsed: true });
      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    it("names the field — a placeholder is not a label", () => {
      setup();
      expect(screen.getByRole("searchbox", { name: "Search vendors" })).toBeInTheDocument();
    });

    it("submits on Enter", async () => {
      const onSearchSubmit = jest.fn();
      setup({ onSearchSubmit, searchValue: "bukky" });
      await userEvent.type(screen.getByRole("searchbox"), "{Enter}");
      expect(onSearchSubmit).toHaveBeenCalled();
    });
  });

  describe("categories", () => {
    it("reports the chosen category by name", async () => {
      const onSelectCategory = jest.fn();
      setup({ onSelectCategory });
      await userEvent.click(screen.getByRole("button", { name: "Beauty" }));
      expect(onSelectCategory).toHaveBeenCalledWith("Beauty");
    });

    // Tapping the selected chip clears the filter; it must not re-select it.
    it("clears with null when the selected chip is tapped again", async () => {
      const onSelectCategory = jest.fn();
      setup({ onSelectCategory, selectedCategory: "Beauty" });
      await userEvent.click(screen.getByRole("button", { name: "Beauty" }));
      expect(onSelectCategory).toHaveBeenCalledWith(null);
    });

    it("announces the selection as pressed, not just as a colour", () => {
      setup({ selectedCategory: "Beauty" });
      expect(screen.getByRole("button", { name: "Beauty" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: "Fashion" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("renders no chip row at all with nothing to filter by", () => {
      setup({ categories: [] });
      expect(screen.queryByRole("group", { name: "Filter by category" })).not.toBeInTheDocument();
    });
  });

  describe("the rotating headline", () => {
    it("shows one slide at a time", () => {
      setup({ slides: ["First message", "Second message"] });
      expect(screen.getByText("First message")).toBeInTheDocument();
      expect(screen.queryByText("Second message")).not.toBeInTheDocument();
    });

    /**
     * The shipped dots are `<div onClick>`: no role, no accessible name, and
     * unreachable from a keyboard. Four controls that simply did not exist for
     * anyone not using a mouse.
     */
    it("exposes each dot as a named button", async () => {
      setup({ slides: ["First message", "Second message"] });
      const dot = screen.getByRole("button", { name: "Show message 2 of 2" });
      await userEvent.click(dot);
      expect(screen.getByText("Second message")).toBeInTheDocument();
    });

    it("marks the current dot", () => {
      setup({ slides: ["First message", "Second message"] });
      expect(screen.getByRole("button", { name: "Show message 1 of 2" })).toHaveAttribute(
        "aria-current",
        "true"
      );
      expect(
        screen.getByRole("button", { name: "Show message 2 of 2" })
      ).not.toHaveAttribute("aria-current");
    });

    it("draws no dots for a single slide", () => {
      setup({ slides: ["Only one"] });
      expect(screen.queryByRole("button", { name: /Show message/ })).not.toBeInTheDocument();
    });
  });

  describe("desktop navigation", () => {
    /**
     * The buyer has NO navigation at lg today: VendorNav is `lg:hidden` and
     * nothing replaces it, so cart, orders and profile are reachable only by
     * typing the URL. These are the destinations that fixes.
     */
    it("offers the buyer's destinations as real links", () => {
      setup();
      const nav = screen.getByRole("navigation", { name: "Your account" });
      expect(within(nav).getByRole("link", { name: /Cart/ })).toHaveAttribute("href", "/cart");
      expect(within(nav).getByRole("link", { name: /Orders/ })).toHaveAttribute("href", "/orders");
      expect(within(nav).getByRole("link", { name: /Profile/ })).toHaveAttribute("href", "/profile");
    });

    it("counts and announces the cart", () => {
      setup({ cartCount: 3 });
      const nav = screen.getByRole("navigation", { name: "Your account" });
      expect(within(nav).getByText("3")).toBeInTheDocument();
      expect(within(nav).getByText("items in cart")).toBeInTheDocument();
    });

    it("shows no badge on an empty cart", () => {
      setup({ cartCount: 0 });
      const nav = screen.getByRole("navigation", { name: "Your account" });
      expect(within(nav).queryByText("items in cart")).not.toBeInTheDocument();
    });
  });
});
