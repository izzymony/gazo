import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchField from "../SearchField";

describe("SearchField", () => {
  it("exposes a searchbox, not a plain textbox", () => {
    render(<SearchField value="" onChange={() => {}} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("has an accessible name even though a placeholder is not a label", () => {
    render(<SearchField value="" onChange={() => {}} placeholder="Search orders" />);
    expect(screen.getByRole("searchbox", { name: "Search orders" })).toBeInTheDocument();
  });

  it("prefers an explicit ariaLabel over the placeholder", () => {
    render(<SearchField value="" onChange={() => {}} placeholder="Search" ariaLabel="Search your orders" />);
    expect(screen.getByRole("searchbox", { name: "Search your orders" })).toBeInTheDocument();
  });

  it("keeps its name once the placeholder is no longer visible", async () => {
    const onChange = jest.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Search orders" />);
    await userEvent.type(screen.getByRole("searchbox"), "shoes");
    expect(screen.getByRole("searchbox", { name: "Search orders" })).toBeInTheDocument();
    expect(onChange).toHaveBeenCalled();
  });

  it("replaces the suppressed outline with a visible focus ring", () => {
    render(<SearchField value="" onChange={() => {}} />);
    expect(screen.getByRole("searchbox").className).toMatch(/focus-visible:ring-2/);
  });
});
