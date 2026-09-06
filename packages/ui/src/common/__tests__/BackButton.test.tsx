import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BackButton from "../header/BackButton";

describe("BackButton", () => {
  it("is a real button, not a clickable div", () => {
    render(<BackButton maskId="t1" onClick={() => {}} />);
    expect(screen.getByRole("button").tagName).toBe("BUTTON");
  });

  it("has a default accessible name", () => {
    render(<BackButton maskId="t2" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });

  it("lets the caller name it", () => {
    render(<BackButton maskId="t3" onClick={() => {}} ariaLabel="Back to store" />);
    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
  });

  it("is keyboard-operable", async () => {
    const onClick = jest.fn();
    render(<BackButton maskId="t4" onClick={onClick} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });
});
