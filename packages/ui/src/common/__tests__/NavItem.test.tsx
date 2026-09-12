import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NavItem from "../NavItem";

const icon = <svg data-testid="glyph" />;

describe("NavItem", () => {
  it("is a link, not a button — nav changes the URL", () => {
    render(<NavItem href="/shop" icon={icon} label="Shop" />);
    const link = screen.getByRole("link", { name: "Shop" });
    expect(link).toHaveAttribute("href", "/shop");
  });

  describe("accessible name", () => {
    // The defect this primitive exists for: the buyer bar was three icon-only
    // links with no name, announced as "link, link, link" on every screen.
    it("names an icon-only item without showing the label", () => {
      render(<NavItem href="/cart" icon={icon} label="Cart" />);
      expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
      expect(screen.getByText("Cart")).toHaveClass("sr-only");
    });

    it("draws the label too when asked, keeping the same name", () => {
      render(<NavItem href="/cart" icon={icon} label="Cart" showLabel />);
      expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
      expect(screen.getByText("Cart")).not.toHaveClass("sr-only");
    });
  });

  describe("active state", () => {
    it("marks the current destination with aria-current, not colour alone", () => {
      render(<NavItem href="/shop" icon={icon} label="Shop" active />);
      expect(screen.getByRole("link", { name: "Shop" })).toHaveAttribute("aria-current", "page");
    });

    it("omits aria-current when not active", () => {
      render(<NavItem href="/shop" icon={icon} label="Shop" />);
      expect(screen.getByRole("link", { name: "Shop" })).not.toHaveAttribute("aria-current");
    });

    it("draws a tokenized selection surface in a floating tab bar", () => {
      render(<NavItem href="/shop" icon={icon} label="Shop" variant="floating" active />);
      expect(screen.getByRole("link", { name: "Shop" })).toHaveClass(
        "min-h-11",
        "rounded-pill",
        "bg-brand-50",
        "text-brandDeep"
      );
    });

    /**
     * A collapsed icon column, not a labelled row with the padding overridden.
     * `rail` is full-width with a full-width selection surface; at 5rem that
     * surface is most of the rail and reads as a highlighted column rather than
     * as a chosen destination, so the glyph carries the state instead.
     */
    describe("compact-rail", () => {
      it("is a square target, centred, with no full-width surface", () => {
        render(<NavItem href="/shop" icon={icon} label="Shop" variant="compact-rail" />);
        const link = screen.getByRole("link", { name: "Shop" });
        expect(link).toHaveClass("size-11", "justify-center");
        expect(link).not.toHaveClass("w-full");
      });

      it("marks selection on the glyph, not with a filled row", () => {
        render(<NavItem href="/shop" icon={icon} label="Shop" variant="compact-rail" active />);
        const link = screen.getByRole("link", { name: "Shop" });
        expect(link).toHaveClass("text-brandDeep");
        expect(link.className).not.toMatch(/\bbg-brand/);
      });

      it("keeps the name for assistive tech even when asked to show a label", () => {
        render(
          <NavItem href="/shop" icon={icon} label="Shop" variant="compact-rail" showLabel />
        );
        // There is no room to draw one, but it must still be announced.
        expect(screen.getByRole("link", { name: "Shop" })).toBeInTheDocument();
        expect(screen.getByText("Shop")).toHaveClass("sr-only");
      });
    });

    it("keeps an unselected floating tab off the brand tint", () => {
      render(<NavItem href="/shop" icon={icon} label="Shop" variant="floating" />);
      const link = screen.getByRole("link", { name: "Shop" });
      expect(link).not.toHaveClass("bg-brand-50");
      expect(link).toHaveClass("text-foreground-muted");
    });
  });

  describe("badge", () => {
    it("announces what the count means — it was a bare coloured dot", () => {
      render(
        <NavItem href="/cart" icon={icon} label="Cart" badge={3} badgeLabel="items in cart" />
      );
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("items in cart")).toHaveClass("sr-only");
    });

    it("renders nothing at zero", () => {
      render(<NavItem href="/cart" icon={icon} label="Cart" badge={0} />);
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("caps at 99+", () => {
      render(<NavItem href="/cart" icon={icon} label="Cart" badge={140} />);
      expect(screen.getByText("99+")).toBeInTheDocument();
    });
  });

  describe("loading", () => {
    it("swaps the glyph for a spinner", () => {
      const { container } = render(<NavItem href="/x" icon={icon} label="X" loading />);
      expect(screen.queryByTestId("glyph")).not.toBeInTheDocument();
      expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
    });

    it("shows the glyph when not loading", () => {
      render(<NavItem href="/x" icon={icon} label="X" />);
      expect(screen.getByTestId("glyph")).toBeInTheDocument();
    });
  });

  describe("disabled", () => {
    it("blocks navigation but keeps its place in the tab order", async () => {
      const onNavigate = jest.fn();
      render(<NavItem href="/x" icon={icon} label="X" disabled onNavigate={onNavigate} />);
      const link = screen.getByRole("link", { name: "X" });
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).toHaveAttribute("tabindex", "-1");
    });

    it("fires onNavigate when enabled", async () => {
      const onNavigate = jest.fn();
      render(
        // jsdom cannot perform navigation, so the real <a> href would log
        // "Not implemented: navigation". Swallowing it here keeps the test
        // about the callback rather than about jsdom.
        <div onClick={(e) => e.preventDefault()}>
          <NavItem href="/x" icon={icon} label="X" onNavigate={onNavigate} />
        </div>
      );
      await userEvent.click(screen.getByRole("link", { name: "X" }));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });
});
