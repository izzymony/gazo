"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Is the document currently visible?
 *
 * Nothing in this repository listened for this before — a grep for
 * `visibilitychange`, `visibilityState` and `document.hidden` returned no hits
 * at all. So every timer and every infinite animation kept running in a
 * background tab, burning a phone's battery to advance a slideshow nobody was
 * looking at.
 *
 * Not built on `useMediaQuery`: this is a document event, not a media query,
 * and `matchMedia` cannot express it.
 *
 * The server snapshot is `true`, and the asymmetry with the other environment
 * hooks is deliberate. `visibilitychange` does not fire on load, so a `false`
 * snapshot would leave a perfectly visible tab paused until the visitor
 * happened to switch away and back. Assume visible and correct on the first
 * event, rather than assume hidden and wait for one that may never come.
 */
export function usePageVisible(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    if (typeof document === "undefined") return () => {};
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

export default usePageVisible;
