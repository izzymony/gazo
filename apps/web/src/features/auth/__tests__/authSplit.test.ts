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

    it("frames itself with the shared shell", () => {
      expect(source).toContain('from "@vibaar/ui/AuthSplitShell"');
      expect(countOf(source, /<AuthSplitShell/g)).toBe(1);
    });

    it("mounts the slideshow once", () => {
      // Two meant two independent engines, free to desync from each other.
      expect(countOf(source, /<AnimatedImages/g)).toBe(1);
      expect(countOf(source, /<SlideContent/g)).toBe(1);
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
      // `% 3` silently stopped matching the moment a fourth slide was added.
      expect(source).toContain("% slidesData.length");
      expect(source).not.toContain("% 3");
    });
  });

  it("sizes the entry CTA responsively instead of taking a layout prop", () => {
    const button = read("AuthOptionButton.tsx");
    // The prop existed only to pick between the two forked blocks' sizing.
    expect(button).not.toMatch(/layout\??\s*[:=]/);
    expect(button).toContain("md:h-14");
  });
});
