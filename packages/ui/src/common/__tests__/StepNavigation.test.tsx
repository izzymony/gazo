import { render, screen } from "@testing-library/react";
import StepNavigation from "../StepNavigation";
import PasswordCriteria from "../PasswordCriteria";
import TransactionIcon from "../TransactionIcon";

describe("StepNavigation", () => {
  it("exposes a progressbar rather than decorative divs", () => {
    render(<StepNavigation step={2} totalSteps={4} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("announces the position, not just a colour", () => {
    render(<StepNavigation step={2} totalSteps={4} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "2");
    expect(bar).toHaveAttribute("aria-valuemax", "4");
    expect(bar).toHaveAccessibleName("");
    expect(bar).toHaveAttribute("aria-valuetext", "Step 2 of 4");
  });
});

describe("PasswordCriteria", () => {
  it("announces rule changes politely", () => {
    const { container } = render(<PasswordCriteria password="" />);
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
  });

  it("states whether each rule is met, not only its colour", () => {
    render(<PasswordCriteria password="Passw0rd" />);
    expect(screen.getAllByText("(met)").length).toBeGreaterThan(0);
  });

  it("marks unmet rules as unmet", () => {
    render(<PasswordCriteria password="short" />);
    expect(screen.getAllByText("(not met)").length).toBeGreaterThan(0);
  });
});

describe("TransactionIcon", () => {
  it("announces money direction rather than relying on glyph colour", () => {
    render(<TransactionIcon icon="payout" type="credit" />);
    expect(screen.getByText("Credit")).toBeInTheDocument();
  });

  it("distinguishes debit from credit", () => {
    render(<TransactionIcon icon="payout" type="debit" />);
    expect(screen.getByText("Debit")).toBeInTheDocument();
  });
});
