"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query as a subscription.
 *
 * This is the plumbing only — `matchMedia`, a listener, and the SSR-safe
 * guards. It exists because there were about to be three copies of it:
 * `useMediaActive` had one for breakpoints, reduced motion needs another, and
 * page visibility needs the same shape again.
 *
 * `serverSnapshot` is required, not defaulted, because there is no safe default.
 * A breakpoint should be `false` on the server (guessing "desktop" emits markup
 * the client tears straight down); page visibility should be `true` (a `false`
 * snapshot would leave a visible tab paused forever, since `visibilitychange`
 * does not fire on load). Making callers state it stops that being decided by
 * whoever copies the file next.
 *
 * Prefer a wrapper over calling this directly with a literal: a query string in
 * a component is how `AnimatedImages` ended up with `window.innerWidth >= 768`
 * next to the `md:` classes, with nothing tying the two numbers together.
 */
export function useMediaQuery(query: string, serverSnapshot: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // Guarded because jsdom has no `matchMedia`; returning a no-op
      // unsubscribe keeps the store inert rather than throwing.
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return serverSnapshot;
    return window.matchMedia(query).matches;
  }, [query, serverSnapshot]);

  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}

export default useMediaQuery;
