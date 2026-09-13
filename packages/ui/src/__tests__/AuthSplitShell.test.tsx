import { render } from "@testing-library/react";
import AuthSplitShell from "../AuthSplitShell";

/**
 * The shell replaced two inlined copies of the same frame, each of which forked
 * mobile and desktop into sibling subtrees that both mounted. So the assertions
 * that matter most are about *how many* of a thing exists, not how it looks.
 *
 * jsdom has no layout, so geometry is proved in the browser pass instead. What
 * is provable here is the structure: counts, order, and which frame each mode
 * builds — the things that silently regress in a refactor.
 */
const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;
const pane = (el: HTMLElement) => el.parentElement as HTMLElement;

/**
 * `matchMedia` does not exist in jsdom, so `useMediaActive` falls back to its
 * server snapshot (`false`) — i.e. every test here renders the MOBILE case
 * unless it opts in. That is the stricter default: it is where `mediaOn`
 * actually has to suppress the artwork.
 */
const withDesktop = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
};

afterEach(() => {
  // @ts-expect-error — restoring jsdom's absent matchMedia between cases.
  delete window.matchMedia;
});

describe("AuthSplitShell", () => {
  describe("renders one tree, not two", () => {
    it("mounts the media once", () => {
      const { queryAllByTestId } = render(
        <AuthSplitShell media={<img data-testid="art" alt="" />}>content</AuthSplitShell>
      );
      // Two would mean the breakpoint fork came back — the bug that made every
      // signed-out visit run two slideshows and fetch each background twice.
      expect(queryAllByTestId("art")).toHaveLength(1);
    });

    it("mounts the children once", () => {
      const { queryAllByTestId } = render(
        <AuthSplitShell media={null}>
          <p data-testid="body">hello</p>
        </AuthSplitShell>
      );
      expect(queryAllByTestId("body")).toHaveLength(1);
    });

    it("mounts the footer action once, positioning it rather than duplicating it", () => {
      const { queryAllByTestId } = render(
        <AuthSplitShell media={null} footerAction={<button data-testid="cta">Go</button>}>
          content
        </AuthSplitShell>
      );
      expect(queryAllByTestId("cta")).toHaveLength(1);
    });

    it("renders no action bar when none is given", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      expect(container.querySelector(".fixed")).toBeNull();
    });
  });

  describe("reading order leads with the form", () => {
    it("puts content before media in the DOM, and hides the decorative pane", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>
          <p data-testid="body">hello</p>
        </AuthSplitShell>
      );
      const position = getByTestId("body").compareDocumentPosition(getByTestId("art"));
      // The artwork follows the form, so tab and screen-reader order start at
      // the thing the visitor came to do.
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(pane(getByTestId("art"))).toHaveAttribute("aria-hidden", "true");
    });

    it("restores media-first VISUAL order on mobile, which the DOM no longer gives", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>content</AuthSplitShell>
      );
      // `order` is the only thing putting the band back on top. Its correctness
      // is proved by measurement at 390 — this pins that it is applied at all.
      expect(pane(getByTestId("art")).className).toContain("order-first");
      expect(pane(getByTestId("art")).className).toContain("md:order-none");
    });
  });

  describe("media modes", () => {
    it("`always` keeps the artwork on mobile, and server-renders it", () => {
      // No matchMedia — the server snapshot. Welcome's hero is above the fold
      // and `priority`, so gating it on a client-only query would blank it.
      const { queryAllByTestId } = render(
        <AuthSplitShell mediaOn="always" media={<span data-testid="art" />}>
          content
        </AuthSplitShell>
      );
      expect(queryAllByTestId("art")).toHaveLength(1);
    });

    it("`desktop` renders NO media box on mobile — not a hidden one", () => {
      withDesktop(false);
      const { queryAllByTestId } = render(
        <AuthSplitShell mediaOn="desktop" media={<img data-testid="art" alt="" />}>
          content
        </AuthSplitShell>
      );
      // `hidden` would still download three slide backgrounds and run the
      // animation loop for a phone that never sees them.
      expect(queryAllByTestId("art")).toHaveLength(0);
    });

    it("`desktop` mounts the artwork once the breakpoint matches", () => {
      withDesktop(true);
      const { queryAllByTestId } = render(
        <AuthSplitShell mediaOn="desktop" media={<img data-testid="art" alt="" />}>
          content
        </AuthSplitShell>
      );
      expect(queryAllByTestId("art")).toHaveLength(1);
    });

    it("collapses its mobile frame in `desktop` mode so the step body is untouched", () => {
      withDesktop(false);
      const { container } = render(
        <AuthSplitShell mediaOn="desktop" media={null}>
          content
        </AuthSplitShell>
      );
      // `contents` promotes the column to the app scroller, which is where
      // PageShell used to sit — that is what keeps mobile unchanged.
      expect(root(container).className).toContain("contents");
    });
  });

  describe("the frame", () => {
    it("measures itself against the dynamic viewport, not 100vh", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      const className = root(container).className;
      expect(className).toContain("min-h-dvh");
      expect(className).not.toContain("min-h-screen");
      expect(className).not.toContain("h-screen");
    });

    it("splits at md, the breakpoint the auth screens already used", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      expect(root(container).className).toContain("md:grid");
      expect(root(container).className).not.toContain("lg:grid ");
    });

    it("carries no max-width, so the media keeps growing past 1280", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      // `max-w-7xl` capped the frame at 1280 and froze the pane at 592px — the
      // media stopped growing exactly where there was most room for it.
      expect(root(container).className).not.toMatch(/\bmd:max-w-/);
      expect(root(container).className).not.toMatch(/\bmax-w-7xl\b/);
    });

    it("gives the media column the surplus while the content column clamps", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      expect(root(container).className).toContain("lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]");
    });

    it("insets the frame equally, so the media's top, bottom and right match", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      // Uniform padding is what makes the three insets equal; `px`/`py` pairs
      // would not.
      expect(root(container).className).toContain("md:p-6");
      expect(root(container).className).toContain("lg:p-8");
    });

    it("rounds the media pane with the token, not a raw utility", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>content</AuthSplitShell>
      );
      expect(pane(getByTestId("art")).className).toContain("md:rounded-panel");
      expect(pane(getByTestId("art")).className).not.toContain("rounded-3xl");
    });

    it("makes the media pane a size container so the artwork scales by both axes", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>content</AuthSplitShell>
      );
      // Without this the composition scales off the viewport and a short window
      // crops it instead of shrinking it.
      expect(pane(getByTestId("art")).className).toContain("container-size");
    });

    it("sizes the mobile band itself, so the three screens cannot disagree", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>content</AuthSplitShell>
      );
      const className = pane(getByTestId("art")).className;
      expect(className).toContain("h-auth-band");
      // One height, driven by viewport HEIGHT. A `sm:` step varies it by width,
      // which is not the axis that decides whether the actions fit.
      expect(className).not.toMatch(/sm:h-/);
      expect(className).not.toMatch(/\bh-\[\d+px\]/);
    });
  });

  describe("action modes", () => {
    const bar = (c: HTMLElement) => c.querySelector(".fixed") as HTMLElement;

    it("`landing` keeps the shell's own bar", () => {
      const { container } = render(
        <AuthSplitShell media={null} footerAction={<button>Go</button>}>
          content
        </AuthSplitShell>
      );
      expect(bar(container).className).toContain("border-outline");
      expect(bar(container).className).toContain("px-4");
      expect(bar(container).className).toContain("pb-3");
    });

    it("`step` reproduces PageShell's bar to the pixel", () => {
      const { container } = render(
        <AuthSplitShell media={null} actionMode="step" footerAction={<button>Go</button>}>
          content
        </AuthSplitShell>
      );
      // These steps rendered inside PageShell until now. A different gutter or
      // border here is a visible change to every progressive screen on mobile.
      expect(bar(container).className).toContain("border-outline-subtle");
      expect(bar(container).className).toContain("px-3");
      expect(bar(container).className).toContain("pb-5");
    });

    it("clears each bar by its own height, not one shared guess", () => {
      const landing = render(
        <AuthSplitShell media={null} footerAction={<button>Go</button>}>
          content
        </AuthSplitShell>
      );
      const step = render(
        <AuthSplitShell media={null} actionMode="step" footerAction={<button>Go</button>}>
          content
        </AuthSplitShell>
      );
      expect(landing.container.querySelector(".pb-20")).not.toBeNull();
      expect(step.container.querySelector(".pb-24")).not.toBeNull();
    });

    it("un-pins both bars into the column at md", () => {
      const { container } = render(
        <AuthSplitShell media={null} actionMode="step" footerAction={<button>Go</button>}>
          content
        </AuthSplitShell>
      );
      expect(bar(container).className).toContain("md:static");
    });
  });

  describe("the step header", () => {
    it("renders above the column, inside it", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={null} actionMode="step" header={<i data-testid="hdr" />}>
          <p data-testid="body">hello</p>
        </AuthSplitShell>
      );
      const position = getByTestId("hdr").compareDocumentPosition(getByTestId("body"));
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("offsets the content for the absolute mobile header, but only on mobile", () => {
      const { container } = render(
        <AuthSplitShell media={null} actionMode="step" header={<i />}>
          content
        </AuthSplitShell>
      );
      // The header is only `absolute` below md; carrying mt-16 into the split
      // would push the form down a column that no longer needs clearing.
      const inner = container.querySelector(".mt-16") as HTMLElement;
      expect(inner).not.toBeNull();
      expect(inner.className).toContain("md:mt-0");
    });

    it("adds no offset when there is no header", () => {
      const { container } = render(
        <AuthSplitShell media={null} actionMode="step">
          content
        </AuthSplitShell>
      );
      expect(container.querySelector(".mt-16")).toBeNull();
    });
  });
});
