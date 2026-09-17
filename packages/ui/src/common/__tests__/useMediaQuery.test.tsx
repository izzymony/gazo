import { render } from "@testing-library/react";
import useMediaQuery from "../useMediaQuery";
import useMediaActive from "../useMediaActive";
import usePrefersReducedMotion from "../usePrefersReducedMotion";

/**
 * jsdom has no `matchMedia`, which is the interesting case rather than an
 * inconvenience: it is exactly the server snapshot, and it is what these hooks
 * return during SSR. Every test that wants a match has to opt in.
 */
const listeners = new Set<() => void>();

function installMatchMedia(matches: boolean, capture?: (query: string) => void) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      capture?.(query);
      return {
        matches,
        media: query,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      };
    },
  });
}

afterEach(() => {
  listeners.clear();
  // @ts-expect-error — restoring jsdom's absent matchMedia between cases.
  delete window.matchMedia;
});

/** Renders a hook and exposes its latest value. */
function probe(useHook: () => boolean) {
  const seen: boolean[] = [];
  const Probe = () => {
    seen.push(useHook());
    return null;
  };
  const utils = render(<Probe />);
  return { seen, last: () => seen[seen.length - 1], ...utils };
}

describe("useMediaQuery", () => {
  it("returns the server snapshot when matchMedia is absent", () => {
    // Both directions, because the whole point of requiring the argument is
    // that neither value is a safe default for every caller.
    expect(probe(() => useMediaQuery("(min-width: 768px)", false)).last()).toBe(false);
    expect(probe(() => useMediaQuery("(min-width: 768px)", true)).last()).toBe(true);
  });

  it("reads the live value once matchMedia exists", () => {
    installMatchMedia(true);
    expect(probe(() => useMediaQuery("(min-width: 768px)", false)).last()).toBe(true);
  });

  it("subscribes, and unsubscribes on unmount", () => {
    installMatchMedia(false);
    const { unmount } = probe(() => useMediaQuery("(min-width: 768px)", false));
    expect(listeners.size).toBe(1);
    unmount();
    // A listener surviving unmount is how a hook like this leaks across a
    // route change, silently, for the life of the tab.
    expect(listeners.size).toBe(0);
  });
});

describe("useMediaActive", () => {
  it("builds its query from the design tokens, not a literal", () => {
    const queries: string[] = [];
    installMatchMedia(true, (q) => queries.push(q));
    probe(() => useMediaActive("md"));
    // 768px must come from `tokens.screens`, which a contract test pins against
    // Tailwind's resolved config. A literal here is the second-source problem
    // the hook was written to remove.
    expect(queries).toContain("(min-width: 768px)");
  });

  it("still defaults to md, and still reports false on the server", () => {
    expect(probe(() => useMediaActive()).last()).toBe(false);
  });
});

describe("usePrefersReducedMotion", () => {
  it("asks for the reduce preference", () => {
    const queries: string[] = [];
    installMatchMedia(true, (q) => queries.push(q));
    probe(usePrefersReducedMotion);
    expect(queries).toContain("(prefers-reduced-motion: reduce)");
  });

  it("assumes motion is fine on the server", () => {
    // Deliberate: the auth artwork must stay server-renderable, and for these
    // users the app's blanket CSS rule has already flattened every transition
    // before hydration. The hook exists for what CSS cannot reach — a WAAPI
    // animation and a running timer — and both are client-side anyway.
    expect(probe(usePrefersReducedMotion).last()).toBe(false);
  });

  it("reports the preference once the client can read it", () => {
    installMatchMedia(true);
    expect(probe(usePrefersReducedMotion).last()).toBe(true);
  });
});
