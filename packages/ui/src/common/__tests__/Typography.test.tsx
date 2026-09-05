import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import H1 from "../Typography";

describe("Typography / H1", () => {
  it("renders its children", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.getByText("Sell smarter")).toBeInTheDocument();
  });

  it("renders a semantic h1 heading", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.getByRole("heading", { level: 1, name: "Sell smarter" })).toBeInTheDocument();
  });

  it("keeps its base type/colour classes", () => {
    render(<H1 className="">Sell smarter</H1>);
    const el = screen.getByText("Sell smarter");
    expect(el).toHaveClass("font-medium", "text-h1", "text-center", "text-foreground-primary");
  });

  it("does not carry the redundant arbitrary tracking override", () => {
    render(<H1 className="">Sell smarter</H1>);
    expect(screen.getByText("Sell smarter")).not.toHaveClass("tracking-[0px]");
  });

  it("appends a caller className without dropping the base classes", () => {
    render(<H1 className="mt-4 text-left">Sell smarter</H1>);
    const el = screen.getByText("Sell smarter");
    expect(el).toHaveClass("mt-4", "text-left");
    expect(el).toHaveClass("text-h1", "text-foreground-primary");
  });

  it("merges conflicting utility classes so the caller override wins", () => {
    render(<H1 className="text-left">Sell smarter</H1>);
    const el = screen.getByText("Sell smarter");
    expect(el).toHaveClass("text-left");
    expect(el).not.toHaveClass("text-center");
  });

  it("forwards native heading attributes and its ref", () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<H1 ref={ref} id="page-title" aria-describedby="intro">Sell smarter</H1>);
    expect(ref.current).toBe(screen.getByRole("heading"));
    expect(ref.current).toHaveAttribute("id", "page-title");
    expect(ref.current).toHaveAttribute("aria-describedby", "intro");
  });
});
