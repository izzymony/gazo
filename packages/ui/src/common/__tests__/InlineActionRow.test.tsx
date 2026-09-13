import { render, screen } from "@testing-library/react";
import InlineActionRow from "../InlineActionRow";
import PageActionButton from "../PageActionButton";

/**
 * The desktop rule this enforces: an inline page action is CONSTRAINED and
 * RIGHT-ALIGNED. Full-width or horizontally centred is the desktop equivalent
 * of the viewport-fixed bar this work exists to remove — it passes a gate
 * worded around `position: fixed` while breaking the intent.
 */
describe("InlineActionRow", () => {
  const row = (c: HTMLElement) => c.firstChild as HTMLElement;

  // THE REGRESSION THIS GUARDS. `payouts/details` passes `undefined` for every
  // non-refund transaction. An empty constrained row would ship a stray 44px
  // gap on each of them — visible, pointless, and nobody's fault in review.
  it("renders nothing at all when there is no action and no status", () => {
    const { container } = render(<InlineActionRow />);
    expect(container.firstChild).toBeNull();
  });

  it("right-aligns at lg and stacks on mobile", () => {
    const { container } = render(
      <InlineActionRow>
        <PageActionButton onClick={() => {}}>Save</PageActionButton>
      </InlineActionRow>
    );
    expect(row(container)).toHaveClass("flex", "flex-col", "lg:flex-row", "lg:justify-end");
  });

  it("puts status opposite the actions rather than beside them", () => {
    const { container } = render(
      <InlineActionRow status={<span>Unsaved changes</span>}>
        <PageActionButton onClick={() => {}}>Save</PageActionButton>
      </InlineActionRow>
    );
    expect(row(container)).toHaveClass("lg:justify-between");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("applies the inline width floor as a token, not an arbitrary value", () => {
    const { container } = render(
      <InlineActionRow>
        <PageActionButton onClick={() => {}}>Save</PageActionButton>
      </InlineActionRow>
    );
    // Two silent-nothing traps, both hit while writing this and both verified
    // against the GENERATED stylesheet rather than assumed:
    //   1. `minWidth` carries no spacing scale in Tailwind, so `min-w-44`
    //      emits nothing at all. The floor is a token.
    //   2. Variant ORDER matters. `[&>*]:lg:min-w-action` emits nothing;
    //      the responsive variant has to be outermost.
    const cls = row(container).className;
    expect(cls).toContain("lg:[&>*]:min-w-action");
    expect(cls).not.toMatch(/\[&>\*\]:lg:/);
    expect(cls).not.toMatch(/min-w-\[/);
  });
});
