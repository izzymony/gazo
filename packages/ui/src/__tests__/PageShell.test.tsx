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
