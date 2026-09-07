import { render, screen } from "@testing-library/react";
import Badge from "../Badge";
import StoreStatusBadge from "../StoreStatusBadge";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>Draft</Badge>);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("defaults to the neutral soft chip", () => {
    render(<Badge>Draft</Badge>);
    const badge = screen.getByText("Draft");
    expect(badge).toHaveClass("bg-surface-subtle", "rounded-pill", "border");
  });

  describe("tone", () => {
    // The whole point of the consolidation: one mapping decides what a tone
    // looks like. These assert the token classes reach the DOM, because a
    // composed `bg-${tone}-surface` would compile to nothing under Tailwind's
    // JIT and the badge would silently render untinted.
    it.each([
      ["success", "bg-success-surface", "text-success-foreground"],
      ["error", "bg-error-surface", "text-error-foreground"],
      ["warning", "bg-warning-surface", "text-warning-foreground"],
      ["info", "bg-info-surface", "text-info-foreground"],
      ["brand", "bg-brand-50", "text-brandDeep"],
      ["teal", "bg-hue-teal-surface", "text-hue-teal-foreground"],
      ["purple", "bg-hue-purple-surface", "text-hue-purple-foreground"],
    ] as const)("%s applies its token classes", (tone, background, foreground) => {
      render(<Badge tone={tone}>Label</Badge>);
      expect(screen.getByText("Label")).toHaveClass(background, foreground);
    });

    it("falls back to neutral for an unknown tone rather than rendering unstyled", () => {
      // @ts-expect-error — deliberately outside the union, as API data can be.
      render(<Badge tone="chartreuse">Label</Badge>);
      expect(screen.getByText("Label")).toHaveClass("bg-surface-subtle");
    });
  });

  describe("variant", () => {
    it("solid fills instead of tinting", () => {
      render(<Badge tone="success" variant="solid">Label</Badge>);
      const badge = screen.getByText("Label");
      expect(badge).toHaveClass("bg-success-foreground", "text-white");
      expect(badge).not.toHaveClass("bg-success-surface");
    });

    it("plain drops the container entirely", () => {
      render(<Badge tone="success" variant="plain">Label</Badge>);
      const badge = screen.getByText("Label");
      expect(badge).toHaveClass("text-success-foreground");
      expect(badge).not.toHaveClass("rounded-pill", "border");
    });

    it("brand solid carries brandInk, never white — white on brand is 1.28:1", () => {
      render(<Badge tone="brand" variant="solid">Sale</Badge>);
      const badge = screen.getByText("Sale");
      expect(badge).toHaveClass("bg-brand", "text-brandInk");
      expect(badge).not.toHaveClass("text-white");
    });
  });

  describe("accessibility", () => {
    it("hides the decorative dot from screen readers", () => {
      render(<Badge tone="success" dot>Live</Badge>);
      const dot = screen.getByText("Live").querySelector("[aria-hidden='true']");
      expect(dot).toBeInTheDocument();
    });

    it("announces srLabel for labels that colour alone would disambiguate", () => {
      render(<Badge tone="success" srLabel="increase">12%</Badge>);
      expect(screen.getByText("increase")).toHaveClass("sr-only");
    });

    it("adds no screen-reader text when srLabel is omitted", () => {
      const { container } = render(<Badge>12%</Badge>);
      expect(container.querySelector(".sr-only")).toBeNull();
    });
  });

  describe("layout", () => {
    // Regression: gap was conditional on dot/icon, so a trailing child — the
    // trend arrow — touched its label. gap only acts between children, so it
    // costs nothing on a text-only badge and must always be present.
    it("spaces a trailing child from the label without being told about it", () => {
      render(
        <Badge tone="success" variant="plain">
          12%
          <svg data-testid="arrow" />
        </Badge>
      );
      expect(screen.getByTestId("arrow").parentElement).toHaveClass("gap-1");
    });

    it("keeps the sm dot at 8px — the size StoreStatusBadge shipped with", () => {
      render(<Badge tone="success" dot>Live</Badge>);
      const dot = screen.getByText("Live").querySelector("[aria-hidden='true']");
      expect(dot).toHaveClass("w-2", "h-2");
    });
  });

  describe("presets stay thin", () => {
    it("StoreStatusBadge maps live/inactive onto tones, not its own colours", () => {
      const { rerender } = render(<StoreStatusBadge isActive />);
      expect(screen.getByText("Live")).toHaveClass("text-success-foreground");
      rerender(<StoreStatusBadge isActive={false} />);
      expect(screen.getByText("Inactive")).toHaveClass("text-foreground-secondary");
    });

    it("StoreStatusBadge keeps its medium weight — plain badges are weightless by design", () => {
      render(<StoreStatusBadge isActive />);
      expect(screen.getByText("Live")).toHaveClass("font-medium");
    });
  });
});
