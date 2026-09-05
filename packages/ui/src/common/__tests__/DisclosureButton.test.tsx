import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisclosureButton from "../DisclosureButton";
import Accordion from "../Accordion";

// The contract every hand-rolled disclosure in the app was missing. Locks the
// behaviour so the class-for-class migrations can't quietly lose it.

describe("DisclosureButton", () => {
  it("renders a real <button> that never submits", () => {
    render(<DisclosureButton expanded={false}>Details</DisclosureButton>);
    const btn = screen.getByRole("button", { name: "Details" });
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveAttribute("type", "button");
  });

  it("binds aria-expanded to the expanded prop", () => {
    const { rerender } = render(<DisclosureButton expanded={false}>Details</DisclosureButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    rerender(<DisclosureButton expanded>Details</DisclosureButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("links to its region through aria-controls", () => {
    render(<DisclosureButton expanded controls="panel-1">Details</DisclosureButton>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-controls", "panel-1");
  });

  it("owns no visuals — the caller's className is the whole appearance", () => {
    render(<DisclosureButton expanded={false} className="w-full p-4 flex">Details</DisclosureButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("w-full", "p-4", "flex");
    expect(btn).toHaveClass("focus-visible:ring-2");
  });

  it("cannot have aria-expanded or type overridden by spread props", () => {
    // @ts-expect-error — deliberately passing props the type forbids
    render(<DisclosureButton expanded type="submit" aria-expanded={false}>Details</DisclosureButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("spreads native attributes and forwards the ref", async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = jest.fn();
    render(
      <DisclosureButton expanded={false} ref={ref} id="d1" data-testid="dis" onClick={onClick}>
        Details
      </DisclosureButton>
    );
    expect(ref.current).toBe(screen.getByTestId("dis"));
    expect(ref.current).toHaveAttribute("id", "d1");
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Accordion (built on DisclosureButton)", () => {
  it("exposes expanded state and links trigger to panel", async () => {
    render(<Accordion title="Shipping">Body</Accordion>);
    const btn = screen.getByRole("button", { name: /Shipping/ });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByText("Body");
    expect(btn.getAttribute("aria-controls")).toBe(panel.getAttribute("id"));
  });
});
