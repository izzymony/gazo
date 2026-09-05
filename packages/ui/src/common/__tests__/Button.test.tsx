import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../Button";

// Behavioural safety net for the shared Button before its API gets hardened
// across ~57 call sites. Asserts render, interaction guards, the loading/disabled
// contract, and the cva variant/size/fullWidth output (exact-token via toHaveClass).

describe("Button", () => {
  it("renders its children inside a real <button>", () => {
    render(<Button onClick={() => {}}>Continue</Button>);
    const btn = screen.getByRole("button", { name: "Continue" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("uses font-medium in the base — regression guard for the font-500 bug", () => {
    render(<Button onClick={() => {}}>x</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("font-medium");
    expect(btn).not.toHaveClass("font-500");
  });

  it("calls onClick once when clicked while enabled", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClick when disabled", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} disabled>Go</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does NOT call onClick while loading, and exposes an accessible busy state", async () => {
    const onClick = jest.fn();
    render(
      <Button onClick={onClick} loading loadingText="Saving…">
        Save
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders filled variant + md size + fullWidth by default", () => {
    render(<Button onClick={() => {}}>x</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("bg-brand", "text-brandInk"); // filled
    expect(btn).toHaveClass("text-body"); // md (exact token, not text-body-sm/lg)
    expect(btn).toHaveClass("w-full", "mt-4"); // fullWidth
  });

  it("renders the bordered variant", () => {
    render(
      <Button onClick={() => {}} variant="bordered">
        x
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("border", "border-brandDeep", "text-brandDeep", "bg-white");
    expect(btn).not.toHaveClass("bg-brand");
  });

  it("renders the ghost variant", () => {
    render(
      <Button onClick={() => {}} variant="ghost">
        x
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("bg-transparent", "text-brandDeep");
    expect(btn).not.toHaveClass("bg-brand");
    expect(btn).not.toHaveClass("bg-white");
  });

  it("maps size to the type scale (exact token)", () => {
    const { rerender } = render(
      <Button onClick={() => {}} size="sm">
        x
      </Button>
    );
    expect(screen.getByRole("button")).toHaveClass("text-body-sm");
    rerender(
      <Button onClick={() => {}} size="lg">
        x
      </Button>
    );
    expect(screen.getByRole("button")).toHaveClass("text-body-lg");
  });

  it("switches to w-fit when fullWidth is false", () => {
    render(
      <Button onClick={() => {}} fullWidth={false}>
        x
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("w-fit");
    expect(btn).not.toHaveClass("w-full");
  });

  it("forwards the type attribute (defaults to button)", () => {
    const { rerender } = render(<Button onClick={() => {}}>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    rerender(
      <Button onClick={() => {}} type="submit">
        x
      </Button>
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("merges a caller className onto the variant classes", () => {
    render(
      <Button onClick={() => {}} className="mt-10">
        x
      </Button>
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("mt-10");
    expect(btn).toHaveClass("bg-brand"); // variant classes still present
  });

  // --- hardened API (native button contract) --------------------------------

  describe("native button contract", () => {
    it("renders without an onClick — a submit button needs no handler", () => {
      render(<Button type="submit">Save</Button>);
      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });

    it("actually submits its form when type=submit", async () => {
      const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button type="submit">Save</Button>
        </form>
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      // Regression guard: handleClick used to call preventDefault()
      // unconditionally, so this never fired and every call site wired
      // formik.handleSubmit into onClick instead.
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("does NOT submit when type=button (the default)", async () => {
      const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Button onClick={() => {}}>Not a submit</Button>
        </form>
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("spreads native attributes onto the button", () => {
      render(
        <Button id="save-btn" name="save" form="checkout" data-testid="native" aria-describedby="hint">
          Save
        </Button>
      );
      const btn = screen.getByTestId("native");
      expect(btn).toHaveAttribute("id", "save-btn");
      expect(btn).toHaveAttribute("name", "save");
      expect(btn).toHaveAttribute("form", "checkout");
      expect(btn).toHaveAttribute("aria-describedby", "hint");
    });

    it("forwards a ref to the underlying <button>", () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Save</Button>);
      expect(ref.current).toBe(screen.getByRole("button", { name: "Save" }));
    });

    it("lets a caller aria-label win over the loading fallback", () => {
      render(
        <Button loading loadingText="Saving…" aria-label="Save your changes">
          Save
        </Button>
      );
      expect(screen.getByRole("button", { name: "Save your changes" })).toBeInTheDocument();
    });

    it("bubbles normally — a native button does not swallow its click", async () => {
      const onParent = jest.fn();
      const onClick = jest.fn();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div onClick={onParent}>
          <Button onClick={onClick}>Inner</Button>
        </div>
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onParent).toHaveBeenCalledTimes(1);
    });

    it("swallows the click only when stopPropagation is opted into", async () => {
      const onParent = jest.fn();
      render(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div onClick={onParent}>
          <Button onClick={() => {}} stopPropagation>
            Inner
          </Button>
        </div>
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onParent).not.toHaveBeenCalled();
    });

    it("merges a caller style over the internal one instead of replacing it", () => {
      render(
        <Button onClick={() => {}} style={{ marginTop: "8px" }}>
          Styled
        </Button>
      );
      const btn = screen.getByRole("button");
      expect(btn).toHaveStyle({ marginTop: "8px" });
      // Internal style survives — `rest` used to be spread last and wipe it.
      // (Asserted on userSelect, not touchAction: jsdom silently drops
      // properties it does not implement, touch-action among them.)
      expect(btn).toHaveStyle({ userSelect: "none" });
    });

    it("lets loading win over a caller aria-busy={false}", () => {
      render(
        <Button onClick={() => {}} loading aria-busy={false}>
          Save
        </Button>
      );
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });

    it("keeps the caller aria-busy when not loading", () => {
      render(
        <Button onClick={() => {}} aria-busy>
          Save
        </Button>
      );
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });

    it("submits a form it is NOT inside, via form=", async () => {
      const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <>
          <form id="external-form" onSubmit={onSubmit} />
          <Button type="submit" form="external-form">
            Save
          </Button>
        </>
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      // This is the shape the PageShell footerAction call sites need: the CTA
      // renders outside the form, so DOM ancestry cannot associate them.
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("fires haptic feedback exactly once per click", async () => {
      const vibrate = jest.fn();
      Object.defineProperty(window.navigator, "vibrate", { value: vibrate, configurable: true });
      render(<Button onClick={() => {}}>Tap</Button>);
      await userEvent.click(screen.getByRole("button"));
      // Regression guard: onTouchStart AND onTouchEnd both fired haptics, so a
      // tap vibrated twice.
      expect(vibrate).toHaveBeenCalledTimes(1);
    });

    it("passes the click event through to onClick", async () => {
      const onClick = jest.fn();
      render(<Button onClick={onClick}>Go</Button>);
      await userEvent.click(screen.getByRole("button"));
      expect(onClick.mock.calls[0][0]).toHaveProperty("type", "click");
    });
  });
});
