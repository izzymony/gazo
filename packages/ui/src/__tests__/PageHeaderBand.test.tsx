import { render, screen } from "@testing-library/react";
import PageHeaderBand from "../PageHeaderBand";

/**
 * The invariant: ONE action node, last in the DOM, lifted into the header row
 * at lg by grid placement.
 *
 * jsdom has no layout, so placement itself cannot be asserted here — that is a
 * browser check. What CAN be pinned is the contract that makes the placement
 * work, and the two properties that would silently break it: a second copy of
 * the action, and any `md:` leaking into a rule that belongs at `lg`.
 */
describe("PageHeaderBand", () => {
  const band = (c: HTMLElement) => c.firstChild as HTMLElement;

  it("renders the action exactly once", () => {
    render(
      <PageHeaderBand title="Shipping" actions={<button type="button">Save changes</button>}>
        <p>content</p>
      </PageHeaderBand>
    );
    expect(screen.getAllByRole("button", { name: "Save changes" })).toHaveLength(1);
  });

  // Focus order is the reason the action stays after <main> rather than being
  // passed to Header.trailing: in the header it would be announced before the
  // form it submits, which is a WCAG 2.4.3 regression on mobile that CSS cannot
  // undo. Grid placement moves the pixels without moving the node.
  it("keeps the action after the content in DOM order", () => {
    render(
      <PageHeaderBand title="T" actions={<button type="button">Save</button>}>
        <p>content</p>
      </PageHeaderBand>
    );
    const main = screen.getByRole("main");
    const action = screen.getByRole("button", { name: "Save" });
    expect(main.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("widens the track set only when a status slot is used", () => {
    const { container, rerender } = render(
      <PageHeaderBand title="T" actions={<button type="button">Save</button>}>
        <p>c</p>
      </PageHeaderBand>
    );
    expect(band(container)).toHaveClass("lg:grid-cols-page-band");
    rerender(
      <PageHeaderBand title="T" status={<span>Unsaved</span>} actions={<button type="button">Save</button>}>
        <p>c</p>
      </PageHeaderBand>
    );
    expect(band(container)).toHaveClass("lg:grid-cols-page-band-status");
  });

  it("gives progress its own full-span row, not a share of the title row", () => {
    render(
      <PageHeaderBand title="T" progress={<div data-testid="steps" />}>
        <p>c</p>
      </PageHeaderBand>
    );
    expect(screen.getByTestId("steps").parentElement).toHaveClass(
      "lg:col-span-full",
      "lg:row-start-2"
    );
  });

  it("clears the mobile action bar, and only reserves that space when there is one", () => {
    const { rerender } = render(
      <PageHeaderBand title="T" actions={<button type="button">Save</button>}>
        <p>c</p>
      </PageHeaderBand>
    );
    expect(screen.getByRole("main")).toHaveClass("pb-24", "lg:pb-6");
    rerender(
      <PageHeaderBand title="T">
        <p>c</p>
      </PageHeaderBand>
    );
    expect(screen.getByRole("main")).not.toHaveClass("pb-24");
  });

  // `md` is auth's breakpoint; `lg` is the application's. 768–1023 deliberately
  // gets split auth layout AND mobile-style fixed actions. A stray `md:` here
  // would silently move app actions at a width nobody verified.
  it("emits no md: rules — lg is the application breakpoint", () => {
    const { container } = render(
      <PageHeaderBand title="T" status={<span>s</span>} progress={<div />} actions={<button type="button">Save</button>}>
        <p>c</p>
      </PageHeaderBand>
    );
    const all = [...container.querySelectorAll("*")].map((e) => e.className).join(" ");
    expect(all).not.toMatch(/(^|\s)md:/);
  });
});
