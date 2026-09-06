import { render, screen } from "@testing-library/react";
import Section from "../Section";

// Section is on 29 screens. Its title was a <p> and its <section> was unnamed,
// so none of those screens exposed any section structure.

describe("Section", () => {
  it("renders children", () => {
    render(<Section>content</Section>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders the title as a real heading, not a paragraph", () => {
    render(<Section title="Payment">content</Section>);
    const heading = screen.getByRole("heading", { name: "Payment" });
    expect(heading.tagName).toBe("H2");
  });

  it("names the region so the landmark is reachable", () => {
    render(<Section title="Payment">content</Section>);
    expect(screen.getByRole("region", { name: "Payment" })).toBeInTheDocument();
  });

  it("does not claim a landmark when it has no title", () => {
    render(<Section>content</Section>);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("honours titleAs for nested structure", () => {
    render(<Section title="Nested" titleAs="h3">content</Section>);
    expect(screen.getByRole("heading", { name: "Nested" }).tagName).toBe("H3");
  });

  it("keeps its rhythm class and merges a caller className", () => {
    const { container } = render(<Section className="mt-6">content</Section>);
    const section = container.querySelector("section");
    expect(section).toHaveClass("space-y-3", "mt-6");
  });
});
