import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StarRating from "../StarRating";

/**
 * The app drew five stars in five different ways — two hand-rolled inline SVGs
 * in the buyer order list, a `FaStar` row on the product page, a 40-line masked
 * SVG with raw hex in the seller's Reviewed tab, and another row in ProductInfo.
 * This is the one. It moved into the design system so `ReviewCard` could reach
 * it; it had no test in `features/orders` either.
 */
describe("StarRating", () => {
  it("always renders five stars, however low the score", () => {
    const { container } = render(<StarRating value={2} />);
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });

  // The defect in the copies it replaced: a 3-star review rendered THREE stars,
  // so nothing conveyed that the scale went to five.
  it("fills to the score and leaves the rest empty", () => {
    const { container } = render(<StarRating value={3} />);
    const svgs = Array.from(container.querySelectorAll("svg"));
    const filled = svgs.filter((s) => s.getAttribute("fill") === "var(--brand)");
    expect(filled).toHaveLength(3);
  });

  // A rating is not a warning. It used to be painted with the warning token.
  it("uses the brand mark with its deep outline, not the warning colour", () => {
    const { container } = render(<StarRating value={1} />);
    const first = container.querySelector("svg")!;
    expect(first.getAttribute("fill")).toBe("var(--brand)");
    expect(first.getAttribute("stroke")).toBe("var(--brand-deep)");
  });

  it("announces the score — five shapes say nothing on their own", () => {
    render(<StarRating value={4} />);
    expect(screen.getByText("4 out of 5 stars")).toBeInTheDocument();
  });

  describe("as an input", () => {
    // The rows this replaced carried onClick on the <svg> itself: not
    // focusable, not keyboard-operable, announcing nothing.
    it("exposes each star as a named button reporting its index", async () => {
      const onRate = jest.fn();
      render(<StarRating value={0} onRate={onRate} />);
      await userEvent.click(screen.getByRole("button", { name: "Rate 4 stars" }));
      expect(onRate).toHaveBeenCalledWith(4);
    });

    it("says 'star' rather than 'stars' for one", () => {
      render(<StarRating value={0} onRate={() => {}} />);
      expect(screen.getByRole("button", { name: "Rate 1 star" })).toBeInTheDocument();
    });

    it("is operable from the keyboard", async () => {
      const onRate = jest.fn();
      render(<StarRating value={0} onRate={onRate} />);
      screen.getByRole("button", { name: "Rate 2 stars" }).focus();
      await userEvent.keyboard("{Enter}");
      expect(onRate).toHaveBeenCalledWith(2);
    });

    it("reflects the current score as pressed state", () => {
      render(<StarRating value={2} onRate={() => {}} />);
      expect(screen.getByRole("button", { name: "Rate 1 star" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: "Rate 3 stars" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    // Read-only display must not offer buttons to press.
    it("renders no buttons without onRate", () => {
      render(<StarRating value={3} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
