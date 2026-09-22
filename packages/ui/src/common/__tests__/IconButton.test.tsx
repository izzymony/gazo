import { createRef } from "react";
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
    expect(screen.getByRole("button")).toHaveClass("text-foreground-primary", "h-9", "w-9");
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

  // --- hardened API (native button contract, matching Button) ----------------

  describe("native button contract", () => {
    it("spreads native attributes onto the button", () => {
      render(
        <IconButton
          icon={StubIcon}
          label="Close"
          id="close-btn"
          form="checkout"
          data-testid="native"
          aria-describedby="hint"
        />
      );
      const btn = screen.getByTestId("native");
      expect(btn).toHaveAttribute("id", "close-btn");
      expect(btn).toHaveAttribute("form", "checkout");
      expect(btn).toHaveAttribute("aria-describedby", "hint");
    });

    it("forwards a ref to the underlying <button>", () => {
      const ref = createRef<HTMLButtonElement>();
      render(<IconButton ref={ref} icon={StubIcon} label="Close" />);
      expect(ref.current).toBe(screen.getByRole("button", { name: "Close" }));
    });

    it("keeps `label` as the accessible name even if aria-label is passed", () => {
      render(<IconButton icon={StubIcon} label="Close menu" aria-label="something else" />);
      // An icon-only control with no accessible name is unusable, so `label`
      // is required and is applied AFTER the {...rest} spread.
      //
      // Note this is a RUNTIME guarantee only. The props type omits
      // "aria-label" from ButtonHTMLAttributes, but that does not actually
      // reject it — verified: an unknown prop errors, `aria-label` does not.
      // Hence this test rather than a @ts-expect-error.
      expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    });

    it("bubbles normally — it does not swallow the click", async () => {
      const onParent = jest.fn();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div onClick={onParent}>
          <IconButton icon={StubIcon} label="Close" onClick={() => {}} />
        </div>
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onParent).toHaveBeenCalledTimes(1);
    });

    it("applies a caller style", () => {
      render(<IconButton icon={StubIcon} label="Close" style={{ marginTop: "8px" }} />);
      expect(screen.getByRole("button")).toHaveStyle({ marginTop: "8px" });
    });

    it("submits a form it is not inside, via form=", async () => {
      const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <>
          <form id="f" onSubmit={onSubmit} />
          <IconButton icon={StubIcon} label="Submit" type="submit" form="f" />
        </>
      );
      await userEvent.click(screen.getByRole("button", { name: "Submit" }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
