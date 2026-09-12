import { render } from "@testing-library/react";
import AuthSplitShell from "../AuthSplitShell";

/**
 * The shell replaced two inlined copies of the same frame, each of which forked
 * mobile and desktop into sibling subtrees that both mounted. So the assertions
 * that matter most are about *how many* of a thing exists, not how it looks.
 */
const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;

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

  describe("the frame", () => {
    it("measures itself against the dynamic viewport, not 100vh", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      const className = root(container).className;
      // The app root is `h-dvh`; a `100vh` frame disagrees with its own
      // container once mobile Safari's URL bar moves.
      expect(className).toContain("min-h-dvh");
      expect(className).not.toContain("min-h-screen");
      expect(className).not.toContain("h-screen");
    });

    it("splits at md, the breakpoint the auth screens already used", () => {
      const { container } = render(<AuthSplitShell media={null}>content</AuthSplitShell>);
      expect(root(container).className).toContain("md:flex-row");
      expect(root(container).className).not.toContain("lg:flex-row");
    });

    it("rounds the media pane with the token, not a raw utility", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>content</AuthSplitShell>
      );
      const pane = getByTestId("art").parentElement as HTMLElement;
      expect(pane.className).toContain("md:rounded-panel");
      expect(pane.className).not.toContain("rounded-3xl");
    });

    it("keeps both panes shrinkable at md, which is what sets their width", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />}>content</AuthSplitShell>
      );
      const pane = getByTestId("art").parentElement as HTMLElement;
      // w-1/2 + w-1/2 + gap over-commits the row; the columns shrink to fit and
      // that shrink produces their real width. Pinning shrink-0 at md would
      // overflow the container instead.
      expect(pane.className).toContain("md:shrink");
      expect(pane.className).toContain("md:w-1/2");
    });

    it("lets the caller size the mobile band, which the two callers disagree on", () => {
      const { getByTestId } = render(
        <AuthSplitShell media={<span data-testid="art" />} mediaClassName="h-[38vh]">
          content
        </AuthSplitShell>
      );
      expect((getByTestId("art").parentElement as HTMLElement).className).toContain("h-[38vh]");
    });
  });
});
