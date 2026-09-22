import { render, screen } from "@testing-library/react";
import Spinner from "../Spinner";
import Button from "../Button";

describe("Spinner", () => {
  const svg = (container: HTMLElement) => container.querySelector("svg")!;

  it("spins", () => {
    const { container } = render(<Spinner />);
    expect(svg(container)).toHaveClass("animate-spin");
  });

  it("defaults to 20px", () => {
    const { container } = render(<Spinner />);
    expect(svg(container)).toHaveAttribute("width", "20");
    expect(svg(container)).toHaveAttribute("height", "20");
  });

  it("takes an exact px size — the nav swaps a 22px icon for it and 20 shifts the row", () => {
    const { container } = render(<Spinner size={22} />);
    expect(svg(container)).toHaveAttribute("width", "22");
    expect(svg(container)).toHaveAttribute("height", "22");
  });

  it("sizes by attribute, not an arbitrary Tailwind class", () => {
    const { container } = render(<Spinner size={22} />);
    expect(svg(container).getAttribute("class")).not.toMatch(/\[22px\]/);
  });

  describe("colour", () => {
    it("inherits from its context by default", () => {
      const { container } = render(<Spinner />);
      expect(container.querySelector("circle")).toHaveAttribute("stroke", "currentColor");
      expect(container.querySelector("path")).toHaveAttribute("fill", "currentColor");
    });

    it("accepts an explicit colour for when the surrounding text colour is wrong", () => {
      const { container } = render(<Spinner color="var(--brand-deep)" />);
      expect(container.querySelector("circle")).toHaveAttribute("stroke", "var(--brand-deep)");
    });
  });

  describe("accessibility", () => {
    // A spinner inside a control is decorative — the control carries aria-busy
    // and the loading label. Announcing both makes a screen reader say it twice.
    it("is hidden from screen readers by default", () => {
      const { container } = render(<Spinner />);
      expect(svg(container)).toHaveAttribute("aria-hidden", "true");
      expect(svg(container)).not.toHaveAttribute("role");
    });

    it("announces itself only when it IS the whole loading affordance", () => {
      render(<Spinner label="Loading products" />);
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-label", "Loading products");
      expect(status).not.toHaveAttribute("aria-hidden");
    });
  });

  describe("Button composes it rather than keeping a private copy", () => {
    it("renders one spinner while loading, hidden from screen readers", () => {
      const { container } = render(<Button loading>Save</Button>);
      const spinners = container.querySelectorAll("svg.animate-spin");
      expect(spinners).toHaveLength(1);
      expect(spinners[0]).toHaveAttribute("aria-hidden", "true");
    });

    it("keeps the button itself as the announced loading state", () => {
      render(<Button loading loadingText="Saving...">Save</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toBeDisabled();
    });

    it("carries brandInk on a filled button — brand yellow cannot take white", () => {
      const { container } = render(<Button loading>Save</Button>);
      expect(container.querySelector("circle")).toHaveAttribute("stroke", "var(--brand-ink)");
    });

    it("carries brandDeep on a bordered button, where the yellow would vanish", () => {
      const { container } = render(<Button loading variant="bordered">Save</Button>);
      expect(container.querySelector("circle")).toHaveAttribute("stroke", "var(--brand-deep)");
    });
  });
});
