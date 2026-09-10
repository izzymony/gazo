import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChipToggle from "../ChipToggle";

describe("ChipToggle", () => {
  it("is a real button and never submits a form", () => {
    render(<ChipToggle selected={false}>Blue</ChipToggle>);
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("type", "button");
  });

  // The state was colour-only on the variant chips, so a screen reader could not
  // tell which size or colour a shopper had picked.
  it("announces its state with aria-pressed, not colour alone", () => {
    const { rerender } = render(<ChipToggle selected={false}>Blue</ChipToggle>);
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "false");
    rerender(<ChipToggle selected>Blue</ChipToggle>);
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
  });

  it("cannot have its pressed state overridden by a caller", () => {
    // `selected` is the single source of truth: native attributes spread FIRST
    // so a stray aria-pressed cannot win, the same rule Button and IconButton
    // follow. Cast because the prop is deliberately omitted from the public type.
    const props = { "aria-pressed": "false" } as Record<string, string>;
    render(
      <ChipToggle selected {...props}>
        Blue
      </ChipToggle>
    );
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
  });

  it("reports clicks", async () => {
    const onClick = jest.fn();
    render(
      <ChipToggle selected={false} onClick={onClick}>
        Medium
      </ChipToggle>
    );
    await userEvent.click(screen.getByRole("button", { name: "Medium" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("is keyboard-operable", async () => {
    const onClick = jest.fn();
    render(
      <ChipToggle selected={false} onClick={onClick}>
        Large
      </ChipToggle>
    );
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  // The regression this pins: the product page's variant chips were 22px tall,
  // well under the 36px touch minimum, on the control a shopper must operate to
  // buy anything with variants.
  it("meets the touch-target minimum", () => {
    render(<ChipToggle selected={false}>Small</ChipToggle>);
    expect(screen.getByRole("button", { name: "Small" }).className).toContain("min-h-9");
  });

  it("lets a caller add classes without losing the base ones", () => {
    render(
      <ChipToggle selected={false} className="ml-2">
        Blue
      </ChipToggle>
    );
    const chip = screen.getByRole("button", { name: "Blue" });
    expect(chip.className).toContain("ml-2");
    expect(chip.className).toContain("rounded-pill");
  });
});
