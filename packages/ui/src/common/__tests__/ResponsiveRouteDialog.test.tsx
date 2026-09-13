import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResponsiveRouteDialog from "../ResponsiveRouteDialog";

/**
 * The invariant: ONE tree, and CSS — never a breakpoint hook and never a second
 * component — decides whether it reads as a full-screen route or a bounded
 * panel. jsdom cannot measure either presentation, so what is pinned here is
 * that there is exactly one of everything, that the chrome differences are all
 * `lg:`-prefixed, and the modal behaviour a route-backed dialog must have.
 */
describe("ResponsiveRouteDialog", () => {
  const open = (props: Partial<React.ComponentProps<typeof ResponsiveRouteDialog>> = {}) =>
    render(
      <ResponsiveRouteDialog title="Change Password" onClose={props.onClose ?? (() => {})} {...props}>
        <input aria-label="field" />
      </ResponsiveRouteDialog>
    );

  it("names itself from its visible title", () => {
    open();
    expect(screen.getByRole("dialog", { name: "Change Password" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and on the close control", async () => {
    const onClose = jest.fn();
    open({ onClose });
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  // A click inside the panel must not reach the backdrop's handler, or typing in
  // the first field would dismiss the form the moment it is touched.
  it("does not close on a click inside the panel", async () => {
    const onClose = jest.fn();
    open({ onClose });
    await userEvent.click(screen.getByLabelText("field"));
    expect(onClose).not.toHaveBeenCalled();
  });

  /**
   * `Dialog` put `overflow-y: auto` on the panel, so a footer CTA scrolled out
   * of reach on a long form — the recorded reason one screen was never migrated
   * to it. Here the body is the only scroll region and the footer is `shrink-0`.
   */
  it("scrolls the body only, and never the footer", () => {
    const { container } = render(
      <ResponsiveRouteDialog title="T" onClose={() => {}} footer={<button>Save</button>}>
        <p>body</p>
      </ResponsiveRouteDialog>
    );
    const panel = screen.getByRole("dialog");
    expect(panel.className).not.toMatch(/overflow-y-auto/);
    const scrollers = [...container.querySelectorAll(".overflow-y-auto")];
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0]).toHaveClass("min-h-0", "flex-1");
    const footer = screen.getByRole("button", { name: "Save" }).parentElement!.parentElement!;
    expect(footer).toHaveClass("shrink-0");
  });

  it("renders no footer chrome when there is no action", () => {
    const { container } = render(
      <ResponsiveRouteDialog title="T" onClose={() => {}}>
        <p>body</p>
      </ResponsiveRouteDialog>
    );
    expect(container.querySelector(".border-t")).toBeNull();
  });

  /**
   * The panel centres inside the CONTENT area, not the viewport: at 1024 a
   * viewport-centred panel sits half under the seller's 256px rail. The backdrop
   * still dims everything, so the two cannot be the same element.
   */
  it("insets the panel by the shell rail while the backdrop covers the viewport", () => {
    const { container } = render(
      <ResponsiveRouteDialog title="T" onClose={() => {}}>
        <p>body</p>
      </ResponsiveRouteDialog>
    );
    const backdrop = container.firstElementChild!;
    const centring = backdrop.firstElementChild!;
    expect(backdrop).toHaveClass("fixed", "inset-0");
    expect(backdrop.className).not.toMatch(/left-shell-inset/);
    expect(centring).toHaveClass("lg:left-shell-inset");
  });

  // Below lg this is the route it replaced: a full-bleed opaque screen. Every
  // difference from that has to be lg-prefixed, or a phone gets a dialog.
  it("keeps every panel difference at lg, and is full-bleed below it", () => {
    render(
      <ResponsiveRouteDialog title="T" onClose={() => {}} footer={<button>S</button>}>
        <p>body</p>
      </ResponsiveRouteDialog>
    );
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("h-full", "w-full", "bg-surface");
    for (const c of ["lg:max-w-dialog-lg", "lg:max-h-dialog", "lg:rounded-panel", "lg:h-auto"])
      expect(panel).toHaveClass(c);
    // No rounding, no cap and no shadow without the lg: prefix.
    for (const bare of ["rounded-panel", "max-h-dialog", "shadow-pop"])
      expect(panel.className.split(/\s+/)).not.toContain(bare);
  });

  it("takes the narrow panel for a confirmation", () => {
    render(
      <ResponsiveRouteDialog title="T" onClose={() => {}} size="md">
        <p>body</p>
      </ResponsiveRouteDialog>
    );
    expect(screen.getByRole("dialog")).toHaveClass("lg:max-w-dialog");
    expect(screen.getByRole("dialog")).not.toHaveClass("lg:max-w-dialog-lg");
  });
});
