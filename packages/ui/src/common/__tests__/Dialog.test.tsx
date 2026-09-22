import { render, screen } from "@testing-library/react";
import Dialog from "../Dialog";

describe("Dialog", () => {
  it("is not in the document when closed", () => {
    render(<Dialog isOpen={false} onClose={() => {}}>body</Dialog>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("takes its accessible name from the visible title", () => {
    render(<Dialog isOpen onClose={() => {}} title="Confirm withdrawal">body</Dialog>);
    expect(screen.getByRole("dialog", { name: "Confirm withdrawal" })).toBeInTheDocument();
  });

  it("renders that title as a real heading", () => {
    render(<Dialog isOpen onClose={() => {}} title="Confirm withdrawal">body</Dialog>);
    expect(screen.getByRole("heading", { name: "Confirm withdrawal" })).toBeInTheDocument();
  });

  it("falls back to ariaLabel when there is no visible title", () => {
    render(<Dialog isOpen onClose={() => {}} ariaLabel="Filters">body</Dialog>);
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
  });

  it("prefers the title over ariaLabel rather than announcing both", () => {
    render(<Dialog isOpen onClose={() => {}} title="Real title" ariaLabel="Stale label">body</Dialog>);
    expect(screen.getByRole("dialog", { name: "Real title" })).toBeInTheDocument();
  });

  it("is modal", () => {
    render(<Dialog isOpen onClose={() => {}} title="X">body</Dialog>);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
