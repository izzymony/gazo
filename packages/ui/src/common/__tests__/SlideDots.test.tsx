import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlideDots from "../SlideDots";

/**
 * The three implementations this replaces — the marketplace band, the auth
 * slideshow and the marketing hero — were all `<div onClick>`: no role, no
 * accessible name, no keyboard path.
 */
describe("SlideDots", () => {
  it("offers one named button per slide", () => {
    render(<SlideDots count={3} active={0} onSelect={() => {}} itemLabel="message" />);
    expect(screen.getByRole("button", { name: "Show message 1 of 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show message 3 of 3" })).toBeInTheDocument();
  });

  it("reports the slide asked for", async () => {
    const onSelect = jest.fn();
    render(<SlideDots count={4} active={0} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "Show slide 3 of 4" }));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("is operable from the keyboard", async () => {
    const onSelect = jest.fn();
    render(<SlideDots count={3} active={0} onSelect={onSelect} />);
    screen.getByRole("button", { name: "Show slide 2 of 3" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  // Position conveyed by opacity alone says nothing when read aloud.
  it("marks the current slide, and only it", () => {
    render(<SlideDots count={3} active={1} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "Show slide 2 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("button", { name: "Show slide 1 of 3" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  // A single slide has no position to report and nothing else to offer.
  it("renders nothing for one slide or none", () => {
    const { container, rerender } = render(<SlideDots count={1} active={0} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SlideDots count={0} active={0} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("meets the touch floor — the target is 36px, not the 6px dot", () => {
    render(<SlideDots count={2} active={0} onSelect={() => {}} />);
    expect(screen.getByRole("button", { name: "Show slide 1 of 2" }).className).toContain("h-9");
  });
});
