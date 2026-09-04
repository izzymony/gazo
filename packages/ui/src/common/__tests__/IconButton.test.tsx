import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IconButton from "../IconButton";
import type { IconProps } from "../../icons";

// A stub icon standing in for a `../icons` component — records the size/className
// it's handed so we can assert the size-derivation contract. Typed as the real
// ComponentType<IconProps> that IconButton demands: a narrower hand-rolled prop
// type is not assignable under strictFunctionTypes, and this file was never
// type-checked before packages/ui gained a type-check script.
// `import type` is erased at transpile, so the @hugeicons runtime is never pulled in.
const StubIcon: React.ComponentType<IconProps> = ({ size, className }) => (
  <svg data-testid="icon" data-size={size} className={className} />
);

describe("IconButton", () => {
  it("renders a button whose accessible name is the required label", () => {
    render(<IconButton icon={StubIcon} label="Close menu" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("calls onClick when enabled but not when disabled", async () => {
    const onClick = jest.fn();
    const { rerender } = render(<IconButton icon={StubIcon} label="Act" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<IconButton icon={StubIcon} label="Act" onClick={onClick} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1); // still 1 — disabled swallowed the click
  });

  it("defaults to plain variant + md size (36px)", () => {
    render(<IconButton icon={StubIcon} label="x" onClick={() => {}} />);
    expect(screen.getByRole("button")).toHaveClass("text-ink-90", "h-9", "w-9");
  });

  it("applies variant + size classes", () => {
    render(<IconButton icon={StubIcon} label="x" onClick={() => {}} variant="filled" size="lg" />);
    expect(screen.getByRole("button")).toHaveClass("bg-brand", "text-brandInk", "h-11", "w-11");
  });

  it("derives icon size from the button size, overridable via iconSize", () => {
    const { rerender } = render(<IconButton icon={StubIcon} label="x" onClick={() => {}} size="sm" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("data-size", "18");
    rerender(<IconButton icon={StubIcon} label="x" onClick={() => {}} size="lg" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("data-size", "24");
    rerender(<IconButton icon={StubIcon} label="x" onClick={() => {}} size="lg" iconSize={40} />);
    expect(screen.getByTestId("icon")).toHaveAttribute("data-size", "40");
  });
});
