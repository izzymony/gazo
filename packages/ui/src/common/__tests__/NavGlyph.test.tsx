import { render } from "@testing-library/react";
import NavGlyph from "../NavGlyph";

/**
 * Stubs stand in for the icon module so the assertions are about NavGlyph's
 * composition rather than about HugeIcons' path data. Each records the props it
 * was handed, which is the whole contract: the fill layer has to be told to
 * fill, and the outline layer must not be.
 */
const Outline = ({ size, className, fill, strokeWidth }: Record<string, unknown>) => (
  <svg
    data-testid="outline"
    data-class={String(className ?? "")}
    data-fill={String(fill ?? "")}
    data-size={String(size ?? "")}
    data-stroke-width={String(strokeWidth ?? "")}
  />
);

const Solid = ({ size, className }: { size?: number; className?: string }) => (
  <svg data-testid="solid" data-class={String(className ?? "")} data-size={String(size ?? "")} />
);

describe("NavGlyph", () => {
  describe("idle", () => {
    it("draws the outline alone", () => {
      const { container, queryAllByTestId } = render(<NavGlyph icon={Outline} size={22} />);
      expect(queryAllByTestId("outline")).toHaveLength(1);
      expect(queryAllByTestId("solid")).toHaveLength(0);
      // No stacking wrapper when there is nothing to stack.
      expect(container.querySelector("span")).toBeNull();
    });

    it("asks for no fill, so the glyph stays an outline", () => {
      const { getByTestId } = render(<NavGlyph icon={Outline} />);
      expect(getByTestId("outline")).toHaveAttribute("data-fill", "");
      expect(getByTestId("outline")).toHaveAttribute("data-stroke-width", "");
    });
  });

  describe("selected", () => {
    it("stacks a filled layer under the outline", () => {
      const { queryAllByTestId } = render(<NavGlyph active icon={Outline} />);
      // Two of the same glyph: the fill behind, the outline over it.
      expect(queryAllByTestId("outline")).toHaveLength(2);
    });

    it("fills and spreads the lower layer, and leaves the upper one alone", () => {
      const { queryAllByTestId } = render(<NavGlyph active icon={Outline} />);
      const [fill, outline] = queryAllByTestId("outline");
      expect(fill).toHaveAttribute("data-fill", "currentColor");
      expect(fill).toHaveAttribute("data-stroke-width", "2.6");
      expect(outline).toHaveAttribute("data-fill", "");
      expect(outline).toHaveAttribute("data-stroke-width", "");
    });

    it("offsets the fill to the left and colours only that layer", () => {
      const { queryAllByTestId } = render(<NavGlyph active icon={Outline} />);
      const [fill, outline] = queryAllByTestId("outline");
      expect(fill.getAttribute("data-class")).toContain("-translate-x-px");
      expect(fill.getAttribute("data-class")).toContain("text-brand");
      // The outline inherits the nav item's active colour — naming one here
      // would let the bar's token and the glyph's drift apart.
      expect(outline.getAttribute("data-class")).not.toContain("text-");
    });

    it("prefers a bespoke solid over filling the outline", () => {
      const { getByTestId, queryAllByTestId } = render(
        <NavGlyph active icon={Outline} size={22} solid={Solid} />
      );
      expect(getByTestId("solid")).toHaveAttribute("data-size", "22");
      // Only the upper outline remains; the generic fill layer is gone.
      expect(queryAllByTestId("outline")).toHaveLength(1);
    });

    it("draws both layers at the same size", () => {
      const { queryAllByTestId } = render(<NavGlyph active icon={Outline} size={28} />);
      for (const layer of queryAllByTestId("outline")) {
        expect(layer).toHaveAttribute("data-size", "28");
      }
    });
  });
});
