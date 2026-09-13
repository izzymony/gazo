"use client";

import { useEffect, useRef } from "react";

/**
 * Move focus into the new step when the step changes.
 *
 * Hoisting `AuthSplitShell` above the step branch stops the SHELL remounting,
 * which is worth doing — but it does not preserve focus, and was never going
 * to. The control you activated still unmounts: "Create my account" disappears
 * the moment step 1 renders, and the step body replacing it is a different
 * subtree. When the focused element goes away the browser drops focus to
 * `document.body`, so a keyboard user is returned to the top of the document
 * and a screen-reader user is told nothing at all.
 *
 * The target is the step's heading rather than its first input: it names the
 * step, so it is announced before the field, and it does not raise a keyboard
 * on mobile the instant the screen appears. The heading is found by query and
 * made focusable here, rather than by threading a ref through each step
 * component — those render their headings through a shared `H1`, and making
 * three of them forward refs to serve this would be a wide change for a narrow
 * need. If a step has no heading, its container takes focus instead.
 *
 * Skipped on first render: arriving at a URL is not a transition, and stealing
 * focus on load would fight the browser's own restoration after a reload or a
 * back-navigation.
 */
export function useStepFocus(step: number | null) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const changed = previous.current !== null && previous.current !== step;
    previous.current = step;
    if (!changed || step === null) return;

    const container = containerRef.current;
    if (!container) return;

    const target =
      container.querySelector<HTMLElement>("h1, h2, [role='heading']") ?? container;

    // `-1` keeps it out of the tab sequence while allowing programmatic focus,
    // so the tab order after this is still the form itself.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");

    // Without `preventScroll` the browser jumps the column to the heading —
    // the content has only just rendered at its own scroll position, and
    // yanking it is more disorienting than leaving it.
    target.focus({ preventScroll: true });
  }, [step]);

  return containerRef;
}

export default useStepFocus;
