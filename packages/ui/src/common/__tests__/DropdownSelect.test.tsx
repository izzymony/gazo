import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DropdownSelect from "../DropdownSelect";

const OPTIONS = ["ascending", "descending"];

/**
 * This control lived in `features/seller-shell` as a local component, out of
 * reach of the design system — so it never got the treatment the rest of the
 * primitives did. Its options were `<li onClick>`, the trigger announced no
 * expanded state, Escape did nothing, and `py-1` made it a 24px control.
 */
describe("DropdownSelect", () => {
  it("announces itself as a listbox trigger", () => {
    render(<DropdownSelect options={OPTIONS} value="ascending" onSelect={() => {}} />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("meets the 36px touch floor the rest of the system holds", () => {
    render(<DropdownSelect options={OPTIONS} value="ascending" onSelect={() => {}} />);
    expect(screen.getByRole("button").className).toContain("min-h-9");
  });

  it("exposes each option with its selected state", async () => {
    render(<DropdownSelect options={OPTIONS} value="ascending" onSelect={() => {}} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("option", { name: "ascending" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: "descending" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("is operable from the keyboard — the options were divs", async () => {
    const onSelect = jest.fn();
    render(<DropdownSelect options={OPTIONS} value="ascending" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button"));
    screen.getByRole("option", { name: "descending" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("descending");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<DropdownSelect options={OPTIONS} value="ascending" onSelect={() => {}} />);
    const trigger = screen.getByRole("button", { name: /ascending/ });
    await userEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("falls back to a placeholder when nothing is chosen", () => {
    render(
      <DropdownSelect options={OPTIONS} value="" onSelect={() => {}} placeholder="Sort by" />
    );
    expect(screen.getByRole("button", { name: /Sort by/ })).toBeInTheDocument();
  });
});
