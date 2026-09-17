import { readFileSync } from "node:fs";
import { join } from "node:path";

const AUTH = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(AUTH, rel), "utf8");

const OVERVIEWS = [
  ["signin", "signin/SignInOverview.tsx"],
  ["signup", "signup/SignUpOverview.tsx"],
] as const;

const countOf = (source: string, pattern: RegExp) => source.match(pattern)?.length ?? 0;

/**
 * The auth entry screen used to render its frame twice per file: a `md:hidden`
 * mobile subtree beside a `hidden md:flex` desktop one. Both always mounted, so
 * every signed-out visit ran two slideshow engines and fetched all three slide
 * backgrounds twice — 36 <img> nodes on a screen that shows six.
 *
 * These are source assertions rather than render assertions on purpose. The
 * overviews pull four Zustand stores, formik and the router; mocking that lot
 * would test the mocks. What is worth pinning is structural — how MANY of each
 * thing the file contains — and that is visible in the source.
 */
describe("auth step zero renders one tree", () => {
  describe.each(OVERVIEWS)("%s", (_name, path) => {
    const source = read(path);

    it("frames itself with the shared shell, through one controller", () => {
      // The shell is now reached THROUGH `AuthSceneController`, which renders
      // it. A second `AuthSplitShell` here would mean a second frame; a direct
      // one would mean this file had taken the scene state back.
      expect(source).toContain('from "@vibaar/ui/authScene/AuthSceneController"');
      expect(countOf(source, /<AuthSceneController/g)).toBe(1);
      expect(source).not.toContain("@vibaar/ui/AuthSplitShell");
    });

    it("holds no slideshow state of its own", () => {
      // Every one of these was declared above the early returns with no guard,
      // so the timer ticked in states that render no media at all. The
      // controller owns the index, the timer and the pause state now; a
      // reappearance here is the defect coming back.
      expect(source).not.toContain("currentSlide");
      expect(source).not.toContain("setInterval");
      expect(source).not.toContain("slidesData");
    });

    it("has retired the previous slideshow components", () => {
      expect(source).not.toContain("AnimatedImages");
      expect(source).not.toContain("SlideContent");
    });

    it("rotates on the landing only", () => {
      // A form step shows a static scene: no timer, and on mobile no pane at
      // all. `rotate` unguarded would restart the 11-state ticking.
      expect(source).toContain("rotate={liveStep === 0}");
      expect(source).toContain('mediaOn={liveStep === 0 ? "always" : "desktop"}');
    });

    it("states the page heading once, outside the rotation", () => {
      // The rotating caption is a `<p>` inside the panel. The heading is fixed
      // copy in the content column, so the form never moves when the artwork
      // changes — and there is exactly one `h1` on the page.
      expect(countOf(source, /<AuthLandingLead\s*\/>/g)).toBe(1);
      expect(source).not.toMatch(/<h1/);
    });

    it("carries one consent block and one marketplace action", () => {
      expect(countOf(source, /<Footer\s*\/>/g)).toBe(1);
      expect(countOf(source, />\s*Explore Marketplace\s*</g)).toBe(1);
    });

    it("no longer forks the breakpoints into sibling subtrees", () => {
      expect(source).not.toContain("hidden md:flex w-full max-w-7xl");
      expect(source).not.toContain("md:hidden w-full flex flex-col");
    });

    it("has retired the duplicate mobile slideshow", () => {
      expect(source).not.toContain("AnimatedHeader");
    });

    it("derives the slide count from the data, not a literal", () => {
      // `% 3` silently stopped matching the moment the scene list changed
      // length. The wrap now happens once, inside `useSceneRotation`, against
      // the count it was given — so neither the literal nor the modulo should
      // appear in an app file again.
      expect(source).not.toContain("% 3");
      expect(source).not.toMatch(/%\s*slidesData\.length/);
    });
  });

  it("sizes the entry CTA responsively instead of taking a layout prop", () => {
    const button = read("AuthOptionButton.tsx");
    // The prop existed only to pick between the two forked blocks' sizing.
    expect(button).not.toMatch(/layout\??\s*[:=]/);
    expect(button).toContain("md:h-14");
  });
});

/**
 * `router.push("vendors")` — no leading slash, and no /vendors route exists.
 * It resolved to /vendors, which (buyer)/[handle] claims because that
 * catch-all takes every single-segment path, so the signed-out front door's
 * marketplace action landed on a storefront-not-found for a vendor called
 * "vendors" — served as HTTP 200, so nothing flagged it.
 */
describe("the marketplace action points at a route that exists", () => {
  it.each(OVERVIEWS)("%s", (_name, path) => {
    const source = read(path);
    expect(source).toContain('router.push("/shop")');
    expect(source).not.toContain('push("vendors")');
  });
});
