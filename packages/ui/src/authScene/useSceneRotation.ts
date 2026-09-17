"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a scene holds before the next one takes over. */
export const SCENE_DWELL_MS = 6500;

/** How long the crossfade lasts. The outgoing layer is retired after this. */
export const SCENE_FADE_MS = 600;

export interface SceneRotationOptions {
  count: number;
  /** `false` never schedules a timeout at all — the static case. */
  enabled: boolean;
  /** Suspends the dwell without discarding the index. */
  paused: boolean;
  dwellMs?: number;
}

export interface SceneRotation {
  index: number;
  /**
   * The scene being faded out, or `null`.
   *
   * It exists so a crossfade has something to fade FROM without keeping every
   * layer mounted: holding all three alive would request all three images,
   * which is exactly what the mounting test was supposed to prevent.
   */
  outgoing: number | null;
  /** Manual selection. Restarts the dwell, so a click is never immediately overtaken. */
  goTo: (next: number) => void;
}

/**
 * The slideshow's only timer.
 *
 * What it replaces: two byte-identical `useState(0)` + `setInterval(…, 8000)`
 * pairs declared in the page controllers, above every early return, with `[]`
 * deps and no guard — so they ticked in 11 of 14 auth states, and a manual dot
 * click could be overtaken 100ms later because the interval never restarted.
 *
 * Three properties come from using a `setTimeout` keyed on the index rather
 * than a bare `setInterval`:
 *
 *  - `goTo` resets the dwell, because changing the index re-runs the effect.
 *  - Pausing and resuming does not fire immediately on resume; the full dwell
 *    is served again.
 *  - Effect cleanup is the entire teardown story. There is no handle to leak —
 *    which is the defect the old choreography had, where a discarded inner
 *    `setTimeout` stranded an uncancellable animation.
 */
export function useSceneRotation({
  count,
  enabled,
  paused,
  dwellMs = SCENE_DWELL_MS,
}: SceneRotationOptions): SceneRotation {
  const [index, setIndex] = useState(0);
  const [outgoing, setOutgoing] = useState<number | null>(null);

  // Retiring the outgoing layer is a timeout too, and it must be cancellable
  // independently: a second change during a fade replaces the outgoing layer
  // rather than queueing another retirement.
  const retireRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const change = useCallback(
    (next: number) => {
      setIndex((current) => {
        if (next === current) return current;
        setOutgoing(current);
        clearTimeout(retireRef.current);
        retireRef.current = setTimeout(() => setOutgoing(null), SCENE_FADE_MS);
        return next;
      });
    },
    []
  );

  const goTo = useCallback(
    (next: number) => {
      if (count <= 0) return;
      // Wrap rather than clamp, so a caller can pass index+1 without knowing
      // the count. `% count` is derived here, once — it used to be written as
      // a literal `% 3` in two page files, which silently stopped matching
      // when the scene list changed length.
      change(((next % count) + count) % count);
    },
    [change, count]
  );

  useEffect(() => {
    if (!enabled || paused || count <= 1) return;
    const timer = setTimeout(() => change((index + 1) % count), dwellMs);
    return () => clearTimeout(timer);
  }, [enabled, paused, count, index, dwellMs, change]);

  // The retirement timeout outlives the dwell effect, so it needs its own
  // cleanup or a fade interrupted by unmount leaves a pending setState.
  useEffect(() => () => clearTimeout(retireRef.current), []);

  return { index, outgoing, goTo };
}

export default useSceneRotation;
