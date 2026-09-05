import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Switch from "../Switch";

describe("Switch", () => {
  it("renders a switch with an accessible name and reflects checked=true", () => {
    render(<Switch checked onChange={() => {}} aria-label="Enable notifications" />);
    const sw = screen.getByRole("switch", { name: "Enable notifications" });
    expect(sw).toBeInTheDocument();
    expect(sw).toBeChecked();
  });

  it("is unchecked when checked=false", () => {
    render(<Switch checked={false} onChange={() => {}} aria-label="x" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("calls onChange when toggled", async () => {
    const onChange = jest.fn();
    render(<Switch checked={false} onChange={onChange} aria-label="x" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps the control sr-only + peer (regression guard: the dead toggle-checkbox class was removed)", () => {
    render(<Switch checked onChange={() => {}} aria-label="x" />);
    const sw = screen.getByRole("switch");
    expect(sw).toHaveClass("sr-only", "peer");
    expect(sw).not.toHaveClass("toggle-checkbox");
  });

  it("supports the typed brand variant", () => {
    const { container } = render(
      <Switch checked variant="brand" onChange={() => {}} aria-label="x" />
    );
    expect(container.querySelector(".bg-brand")).toBeInTheDocument();
  });

  it("forwards native input attributes and its ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Switch
        ref={ref}
        checked={false}
        onChange={() => {}}
        aria-label="x"
        id="notifications"
        form="settings"
        data-state="off"
      />
    );
    expect(ref.current).toBe(screen.getByRole("switch"));
    expect(ref.current).toHaveAttribute("id", "notifications");
    expect(ref.current).toHaveAttribute("form", "settings");
    expect(ref.current).toHaveAttribute("data-state", "off");
  });

  it("has a disabled state and preserves the minimum interaction target", () => {
    const { container } = render(
      <Switch disabled checked={false} onChange={() => {}} aria-label="x" />
    );
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(container.querySelector("label")).toHaveClass("min-h-9", "min-w-9", "cursor-not-allowed");
  });
});
