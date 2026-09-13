import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import PageShell from "../PageShell";

// PageShell is the single systematic page layout — ~56 importers. These lock
// the frame contract (landmark, width, header offset, hero takeover, footer bar
// + its content clearance, alignment, escape hatches) so the shell can be
// refactored without silently changing every screen's spacing.

/** main → inner wrapper → width container */
const containerOf = (main: HTMLElement) => main.parentElement!.parentElement!;

describe("PageShell", () => {
  it("renders children inside a <main> landmark", () => {
    render(<PageShell>content</PageShell>);
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveTextContent("content");
  });

  describe("width", () => {
    it("defaults to the standard max-w-5xl column with horizontal padding", () => {
      render(<PageShell>content</PageShell>);
      const main = screen.getByRole("main");
      expect(containerOf(main)).toHaveClass("lg:max-w-5xl", "lg:mx-auto");
      expect(main).toHaveClass("px-4", "lg:px-5");
    });

    it("goes full-bleed and drops the column + padding when width=full", () => {
      render(<PageShell width="full">content</PageShell>);
      const main = screen.getByRole("main");
      expect(containerOf(main)).toHaveClass("w-full");
      expect(containerOf(main)).not.toHaveClass("lg:max-w-5xl");
      expect(main).not.toHaveClass("px-4");
    });
  });

  describe("header", () => {
    it("renders the header and offsets content to clear it", () => {
      render(<PageShell header={<div>Back</div>}>content</PageShell>);
      expect(screen.getByText("Back")).toBeInTheDocument();
      expect(screen.getByRole("main")).toHaveClass("mt-16", "lg:mt-4");
    });

    it("applies no header offset when there is no header", () => {
      render(<PageShell>content</PageShell>);
      expect(screen.getByRole("main")).not.toHaveClass("mt-16");
    });

    it("gives top-level blocks a 24px rhythm", () => {
      render(<PageShell>content</PageShell>);
      expect(screen.getByRole("main")).toHaveClass("space-y-6");
    });
  });

  describe("hero", () => {
    it("replaces the header entirely — header is not rendered when hero is set", () => {
      render(
        <PageShell header={<div>Back</div>} hero={<div>Hero</div>}>
          content
        </PageShell>
      );
      expect(screen.getByText("Hero")).toBeInTheDocument();
      expect(screen.queryByText("Back")).not.toBeInTheDocument();
    });

    it("lets the hero own the top edge — no offset, padding or rhythm on the scroll region", () => {
      render(<PageShell hero={<div>Hero</div>}>content</PageShell>);
      const main = screen.getByRole("main");
      expect(main).not.toHaveClass("px-4");
      expect(main).not.toHaveClass("mt-16");
      expect(main).not.toHaveClass("space-y-6");
    });

    it("moves padding and rhythm onto the wrapper below the full-bleed hero", () => {
      render(<PageShell hero={<div>Hero</div>}>content</PageShell>);
      const wrapper = screen.getByText("content");
      expect(wrapper).toHaveClass("px-4", "lg:px-5", "pt-6", "space-y-6");
    });
  });

  describe("footerAction", () => {
    it("renders the action in a fixed bottom bar", () => {
      const { container } = render(
        <PageShell footerAction={<button>Save</button>}>content</PageShell>
      );
      const bar = container.querySelector(".fixed");
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveClass("bottom-0", "z-sticky");
      expect(bar).toContainElement(screen.getByRole("button", { name: "Save" }));
    });

    it("pads the scroll region so content is not hidden behind the bar", () => {
      render(<PageShell footerAction={<button>Save</button>}>content</PageShell>);
      expect(screen.getByRole("main")).toHaveClass("pb-24");
    });

    it("pads the hero content wrapper instead when a hero is present", () => {
      render(
        <PageShell hero={<div>Hero</div>} footerAction={<button>Save</button>}>
          content
        </PageShell>
      );
      expect(screen.getByRole("main")).not.toHaveClass("pb-[100px]");
      expect(screen.getByText("content")).toHaveClass("pb-24");
    });

    it("renders no bar and no bottom padding when there is no action", () => {
      const { container } = render(<PageShell>content</PageShell>);
      expect(container.querySelector(".fixed")).not.toBeInTheDocument();
      expect(screen.getByRole("main")).not.toHaveClass("pb-24");
    });

    /**
     * The bar is fixed to the viewport, so a shell with chrome down one side —
     * the seller dashboard's desktop rail — would have the bar run underneath
     * it. Rather than teach a shared primitive which shells exist, the bar
     * reads an inset that a shell may declare; `shell-inset` is 0 unless one
     * does, so every other caller is unchanged.
     */
    it("clears whatever inset the surrounding shell declares", () => {
      const { container } = render(
        <PageShell footerAction={<button>Save</button>}>content</PageShell>
      );
      const bar = container.querySelector(".fixed")!;
      expect(bar).toHaveClass("left-shell-inset", "right-0");
      expect(bar).not.toHaveClass("left-0");
    });

    /**
     * The desktop rule: no page CTA is viewport-fixed at lg. This bar is the
     * fallback for everything still on `footerAction` — the inline screens, the
     * invalid auth states that fall through here and are not edited
     * individually, and every route-backed dialog reached by direct URL.
     *
     * It previously carried `lg:w-auto`, which existed because `fixed` + `left`
     * + `right` + `w-full` is over-constrained under a non-zero shell inset:
     * CSS drops `right` and the bar keeps its full width from an indented left
     * edge. That hazard is gone with the fixed positioning, and `w-auto` became
     * harmful — as a flex item it shrink-wrapped, and `mx-auto` then centred the
     * result, which is the third thing the desktop rule forbids.
     */
    it("leaves fixed positioning at lg and does not shrink-wrap into the centre", () => {
      const { container } = render(
        <PageShell footerAction={<button>Save</button>}>content</PageShell>
      );
      const bar = container.querySelector(".fixed")!;
      expect(bar).toHaveClass("lg:static", "lg:w-full");
      expect(bar).not.toHaveClass("lg:w-auto");
    });

    it("constrains the desktop action and pushes it to the right edge", () => {
      const { container } = render(
        <PageShell footerAction={<button>Save</button>}>content</PageShell>
      );
      const wrapper = container.querySelector(".fixed > *")!;
      // `contents` below lg is what keeps the mobile bar byte-identical: no box,
      // so the button is still the bar's own child for layout.
      expect(wrapper).toHaveClass("contents", "lg:block", "lg:ml-auto", "lg:w-fit");
      expect(wrapper).toHaveClass("lg:min-w-action", "lg:max-w-sm");
    });

    /**
     * Below lg the header is `absolute` and contributes no flow height, so the
     * column asking for 100% was right. At lg it is `sticky` — in flow, above a
     * sibling asking for the full height — and the column overran the viewport
     * by the header's height, into the shell's `overflow-hidden`. A `fixed` bar
     * hid it; a bar in the flow gets its last 68px clipped.
     */
    it("sizes the column against the space the sticky header leaves", () => {
      const { container } = render(
        <PageShell header={<div>h</div>} footerAction={<button>Save</button>}>
          content
        </PageShell>
      );
      const column = container.querySelector("main")!.parentElement!.parentElement!;
      expect(column).toHaveClass("flex-1", "min-h-0");
      expect(column).not.toHaveClass("h-full");
    });

    it("can keep the action bar inside a composed shell", () => {
      const { container } = render(
        <PageShell footerPosition="contained" footerAction={<button>Save</button>}>
          content
        </PageShell>
      );
      const bar = container.querySelector(".sticky");
      expect(bar).toBeInTheDocument();
      expect(bar).not.toHaveClass("fixed");
    });
  });

  describe("escape hatches", () => {
    it("centres content when align=center", () => {
      render(<PageShell align="center">content</PageShell>);
      expect(screen.getByRole("main")).toHaveClass("items-center", "justify-center");
    });

    it("does not centre by default", () => {
      render(<PageShell>content</PageShell>);
      expect(screen.getByRole("main")).not.toHaveClass("justify-center");
    });

    it("appends contentClassName to the scroll region", () => {
      render(<PageShell contentClassName="bg-brand">content</PageShell>);
      const main = screen.getByRole("main");
      expect(main).toHaveClass("bg-brand");
      expect(main).toHaveClass("overflow-y-auto");
    });

    it("exposes the scroll node through scrollRef", () => {
      const ref = createRef<HTMLElement>();
      render(<PageShell scrollRef={ref}>content</PageShell>);
      expect(ref.current).toBe(screen.getByRole("main"));
    });
  });
});
