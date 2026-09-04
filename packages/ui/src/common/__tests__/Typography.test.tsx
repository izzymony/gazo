import { render, screen } from "@testing-library/react";
import H1 from "../Typography";

// Characterization tests: these pin what Typography does TODAY, defects and
// all, so the hardening pass has to change them deliberately rather than by
// accident. `Typography` is currently a single `H1` export that renders a <p>
// and exposes no heading semantics — that is a real a11y gap, and it is locked
// here precisely so fixing it shows up as a failing test.

describe("Typography / H1", () => {
  it("renders its children", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.getByText("Sell smarter")).toBeInTheDocument();
  });

  it("renders a <p>, NOT a heading element (current behaviour, pinned)", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.getByText("Sell smarter").tagName).toBe("P");
  });

  it("exposes no heading role — a component named H1 is not a heading", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("keeps its base type/colour classes", () => {
    render(<H1 className="">Sell smarter</H1>);
    const el = screen.getByText("Sell smarter");
    expect(el).toHaveClass("font-medium", "text-h1", "text-center", "text-ink-90");
  });

  it("carries the arbitrary tracking-[0px] (drift, pinned so removing it is deliberate)", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.getByText("Sell smarter")).toHaveClass("tracking-[0px]");
  });

  it("appends a caller className without dropping the base classes", () => {
    render(<H1 className="mt-4 text-left">Sell smarter</H1>);
    const el = screen.getByText("Sell smarter");
    expect(el).toHaveClass("mt-4", "text-left");
    expect(el).toHaveClass("text-h1", "text-ink-90");
  });

  it("concatenates rather than merges — the caller override and the base both remain", () => {
    // No cn()/twMerge here, so text-center and text-left BOTH land in the class
    // list and CSS order decides. Pinned: the hardening pass should route this
    // through cn() and this expectation should then change.
    render(<H1 className="text-left">Sell smarter</H1>);
    const el = screen.getByText("Sell smarter");
    expect(el).toHaveClass("text-center");
    expect(el).toHaveClass("text-left");
  });
});
