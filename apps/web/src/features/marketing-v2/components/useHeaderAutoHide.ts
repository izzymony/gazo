"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Committed travel, in px, before the header is allowed to change state. */
const HYSTERESIS = 16;
/** Within this distance of the top the header is always shown. */
const TOP_ZONE = 72;

/**
 * Directional hide/show for the marketing header.
 *
 * The header reads the marketing page's own scroller rather than the window —
 * the page owns its scroll container, so `window.scrollY` never moves.
 *
 * Direction alone is too twitchy to drive this: a trackpad flick or a touch
 * release reverses sign for a frame or two and the header would flap. So each
 * change of sign only re-anchors, and the state flips once the reader has
 * actually travelled HYSTERESIS px in that direction. State is set on those
 * crossings, not per frame, so a scroll costs a rAF read and nothing else.
 *
 * Focus wins over everything: while anything inside the header is focused it
 * stays put, so keyboard users cannot lose the control they are on.
 */
export function useHeaderAutoHide(headerRef: RefObject<HTMLElement>) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    const scroller = header?.closest<HTMLElement>("[data-marketing-scroller]");
    if (!header || !scroller) return;

    // Published on the scroller as well as the header, so the scenes below can
    // claim the clearance back the moment the header leaves.
    const publish = (hidden: boolean) => {
      setIsHidden(hidden);
      scroller.dataset.headerHidden = hidden ? "true" : "false";
    };

    let frame = 0;
    let last = scroller.scrollTop;
    let anchor = last;
    let direction = 0;
    let focusHeld = false;

    const read = () => {
      frame = 0;
      const y = scroller.scrollTop;

      if (y <= TOP_ZONE) {
        anchor = y;
        last = y;
        direction = 0;
        publish(false);
        return;
      }

      const delta = y - last;
      if (delta > 0 && direction <= 0) {
        direction = 1;
        anchor = y;
      } else if (delta < 0 && direction >= 0) {
        direction = -1;
        anchor = y;
      }
      last = y;

      if (focusHeld) return;
      if (direction > 0 && y - anchor > HYSTERESIS) publish(true);
      else if (direction < 0 && anchor - y > HYSTERESIS) publish(false);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    const hold = () => {
      focusHeld = true;
      publish(false);
    };
    const release = () => {
      focusHeld = false;
    };

    scroller.addEventListener("scroll", schedule, { passive: true });
    header.addEventListener("focusin", hold);
    header.addEventListener("focusout", release);

    return () => {
      scroller.removeEventListener("scroll", schedule);
      header.removeEventListener("focusin", hold);
      header.removeEventListener("focusout", release);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [headerRef]);

  return isHidden;
}
