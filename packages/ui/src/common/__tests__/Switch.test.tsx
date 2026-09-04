import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Switch from "../Switch";

describe("Switch", () => {
  it("renders a switch with an accessible name and reflects checked=true", () => {
    render(<Switch checked onChange={() => {}} ariaLabel="Enable notifications" />);
    const sw = screen.getByRole("switch", { name: "Enable notifications" });
    expect(sw).toBeInTheDocument();
    expect(sw).toBeChecked();
  });

  it("is unchecked when checked=false", () => {
    render(<Switch checked={false} onChange={() => {}} ariaLabel="x" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("calls onChange when toggled", async () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} ariaLabel="x" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the control sr-only + peer (regression guard: the dead toggle-checkbox class was removed)", () => {
    render(<Switch checked onChange={() => {}} ariaLabel="x" />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveClass("sr-only", "peer");
    expect(sw).not.toHaveClass("toggle-checkbox");
  });
});
