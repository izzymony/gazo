import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Isolate InputField's own behaviour from the icon lib + PasswordCriteria
// (those are separate primitives with their own coverage).
jest.mock("../../icons", () => ({
  BiChevronDown: () => null,
  CiSearch: () => null,
}));
jest.mock("../PasswordCriteria", () => ({ __esModule: true, default: () => null }));

import InputField from "../InputField";

describe("InputField", () => {
  it("renders a text input with its value + name and shows the placeholder as a label", () => {
    render(
      <InputField type="text" name="email" placeholder="Email address" value="me@x.com" onChange={() => {}} />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("me@x.com");
    expect(input).toHaveAttribute("name", "email");
    expect(screen.getByText("Email address")).toBeInTheDocument();
  });

  it("calls onChange when the value changes", () => {
    const onChange = jest.fn();
    render(<InputField type="text" name="q" placeholder="Search" value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "shoes" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders an error message styled with the red token", () => {
    render(
      <InputField type="text" name="q" placeholder="x" value="" onChange={() => {}} error="Required field" />
    );
    const err = screen.getByText("Required field");
    expect(err).toBeInTheDocument();
    expect(err).toHaveClass("text-red");
  });

  it("keeps text-body + font-medium + peer and drops the dead -z-1 (regression guard)", () => {
    render(<InputField type="text" name="q" placeholder="x" value="" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("text-body", "font-medium", "peer");
    expect(input).not.toHaveClass("-z-1");
  });

  it("toggles password visibility when the eye control is clicked", async () => {
    const { container } = render(
      <InputField type="password" name="pw" placeholder="Password" value="secret" onChange={() => {}} mode="signin" />
    );
    const input = container.querySelector('input[name="pw"]') as HTMLInputElement;
    expect(input).toHaveAttribute("type", "password");
    const eyeToggle = container.querySelector('span[class*="cursor-pointer"]') as HTMLElement;
    await userEvent.click(eyeToggle);
    expect(input).toHaveAttribute("type", "text");
  });
});
