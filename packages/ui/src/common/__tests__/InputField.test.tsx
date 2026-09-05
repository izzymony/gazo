import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Isolate InputField's own behaviour from the icon lib + PasswordCriteria
// (those are separate primitives with their own coverage).
jest.mock("../../icons", () => ({
  BiChevronDown: () => null,
  CiSearch: () => null,
  // The password toggle and product adornment now render real library icons
  // instead of inline SVGs, so the stub has to cover them too.
  MdVisibility: () => null,
  MdVisibilityOff: () => null,
  Package: () => null,
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

  it("renders an error message with the semantic error token", () => {
    render(
      <InputField type="text" name="q" placeholder="x" value="" onChange={() => {}} error="Required field" />
    );
    const err = screen.getByText("Required field");
    expect(err).toBeInTheDocument();
    expect(err).toHaveClass("text-error-foreground");
  });

  it("keeps text-body + font-medium + peer and drops the dead -z-1 (regression guard)", () => {
    render(<InputField type="text" name="q" placeholder="x" value="" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("text-body", "font-medium", "peer");
    expect(input).not.toHaveClass("-z-1");
  });

  it("toggles password visibility when the eye control is clicked", async () => {
    render(
      <InputField type="password" name="pw" placeholder="Password" value="secret" onChange={() => {}} mode="signin" />
    );
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("associates the visible label with the native input", () => {
    render(<InputField type="email" name="email" placeholder="Email address" value="" onChange={() => {}} />);
    expect(screen.getByLabelText("Email address")).toHaveAttribute("type", "email");
  });

  it("forwards native input attributes and its ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <InputField
        ref={ref}
        type="text"
        name="handle"
        placeholder="Handle"
        value=""
        onChange={() => {}}
        id="store-handle"
        autoComplete="username"
        data-field="identity"
      />
    );
    expect(ref.current).toBe(screen.getByRole("textbox"));
    expect(ref.current).toHaveAttribute("id", "store-handle");
    expect(ref.current).toHaveAttribute("autocomplete", "username");
    expect(ref.current).toHaveAttribute("data-field", "identity");
  });

  it("connects error text to the input and exposes invalid state", () => {
    render(
      <InputField type="text" name="handle" placeholder="Handle" value="" onChange={() => {}} error="Already taken" />
    );
    const input = screen.getByRole("textbox");
    const error = screen.getByRole("alert");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
  });

  it("allows optional fields instead of forcing required", () => {
    render(<InputField type="text" name="referral" placeholder="Referral" value="" onChange={() => {}} required={false} />);
    expect(screen.getByRole("textbox")).not.toBeRequired();
  });
});
