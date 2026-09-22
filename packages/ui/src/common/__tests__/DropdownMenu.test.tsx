import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DropdownMenu from "../DropdownMenu";

const OPTIONS = [
  { label: "Edit", onClick: jest.fn() },
  { label: "Delete", onClick: jest.fn() },
];

// The trigger used to be an <svg> with onClick — not focusable, not
// keyboard-operable, announcing nothing.
describe("DropdownMenu", () => {
  it("renders a real button trigger with an accessible name", () => {
    render(<DropdownMenu options={OPTIONS} />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on click and exposes menu semantics", async () => {
    render(<DropdownMenu options={OPTIONS} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("is operable by keyboard alone", async () => {
    render(<DropdownMenu options={OPTIONS} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("runs the option handler and closes", async () => {
    const onClick = jest.fn();
    render(<DropdownMenu options={[{ label: "Edit", onClick }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(<DropdownMenu options={OPTIONS} />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not let opening the menu activate a clickable ancestor", async () => {
    const onCardClick = jest.fn();
    render(
      <div onClick={onCardClick}>
        <DropdownMenu options={OPTIONS} />
      </div>
    );
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
