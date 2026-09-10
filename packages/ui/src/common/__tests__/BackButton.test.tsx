import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackButton from "../header/BackButton";

describe("BackButton", () => {
  it("is a real button, not a clickable div", () => {
    render(<BackButton maskId="t1" onClick={() => {}} />);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("has a default accessible name", () => {
    render(<BackButton maskId="t2" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });

  it("lets the caller name it", () => {
    render(<BackButton maskId="t3" onClick={() => {}} ariaLabel="Back to store" />);
    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
  });

  it("is keyboard-operable", async () => {
    const onClick = jest.fn();
    render(<BackButton maskId="t4" onClick={onClick} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  // The regression this pins: the mask rect was `fill="currentColor"`. A mask is
  // luminance — white reveals, black hides — and `currentColor` inherits the
  // surrounding TEXT colour, which on both storefront headers is dark. The mask
  // resolved to black and hid the arrow, so the back button rendered invisible on
  // the product page while still occupying its slot and passing every other test.
  it("masks with an explicit light fill, never currentColor", () => {
    const { container } = render(<BackButton maskId="t5" onClick={() => {}} />);
    const maskRect = container.querySelector("mask rect");
    expect(maskRect).not.toBeNull();
    expect(maskRect?.getAttribute("fill")).not.toBe("currentColor");
    // Keyword or light hex — what matters is that it does not INHERIT.
    expect(maskRect?.getAttribute("fill")).toMatch(/^(white|#fff|#ffffff)$/i);
  });

  it("points the masked group at its own mask id", () => {
    const { container } = render(<BackButton maskId="unique-1" onClick={() => {}} />);
    expect(container.querySelector("mask")?.getAttribute("id")).toBe("unique-1");
    expect(container.querySelector("g")?.getAttribute("mask")).toBe("url(#unique-1)");
  });
});
