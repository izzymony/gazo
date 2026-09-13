"use client";

import { useCallback, useSyncExternalStore } from "react";
import { tokens } from "@vibaar/design-tokens/tokens";

/**
 * Is the viewport at or above a breakpoint, as a subscription?
 *
 * READ THIS BEFORE USING IT. This is not a way to pick between two layouts.
 * Layout belongs in CSS, and a JS width check that decides layout is the exact
 * defect this codebase has been removing: `AnimatedImages` chose between two
 * hard-coded offset sets with `window.innerWidth >= 768`, evaluated once inside
 * an animation callback with no resize listener, so rotating a tablet left the
 * artwork on the wrong geometry until the next slide.
 *
 * What it IS for is resource lifecycle — whether an expensive subtree is worth
 * mounting at all. The auth split's artwork is three slide backgrounds plus
 * nine floating cards plus a running animation loop; on a progressive step it
 * is desktop-only decoration. Hiding it in CSS would keep every one of those
 * images downloading and every timer running for a phone that will never see
 * them, which on a 3G connection is not a cosmetic difference. So the artwork
 * mounts only where it is shown, while the shell, the form and the actions stay
 * one tree at every width.
 *
 * The breakpoint comes from `tokens.screens`, which restates Tailwind's own
 * values, and a contract test asserts the two still agree. Passing a literal
 * here would recreate the second-source problem in a new place.
 *
 * The server snapshot is `false`: there is no viewport during SSR, and guessing
 * "desktop" would emit markup that the client immediately tears down. Callers
 * that need their media server-rendered — anything above the fold — must not
 * gate on this at all.
 */
export function useMediaActive(breakpoint: keyof typeof tokens.screens = "md"): boolean {
  const query = `(min-width: ${tokens.screens[breakpoint]})`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      // Guarded because a subscribe callback can still run in environments
      // without matchMedia (jsdom without a polyfill); returning a no-op
      // unsubscribe keeps the store inert rather than throwing.
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default useMediaActive;
