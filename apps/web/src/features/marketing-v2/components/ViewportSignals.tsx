"use client";

import { useEffect } from "react";

/**
 * One observer for the page's two viewport-driven signals, so a reveal and a
 * "stop animating off-screen" gate do not each cost their own listener.
 *
 * `data-reveal`  — one-shot. Set to "true" the first time the element arrives
 *                  and then unobserved, because a reveal that replays every
 *                  time you scroll past reads as a page that will not settle.
 * `data-inview`  — two-way. Tracks presence for as long as the element lives,
 *                  which is what lets an idle animation pause once its section
 *                  has gone by rather than running for the whole session.
 *
 * The audience panels do not use either: the journey controller already knows
 * where they are, and it publishes that as `data-scene`.
 */
export default function ViewportSignals() {
  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const presenceTargets = document.querySelectorAll<HTMLElement>("[data-inview]");

    const reveal = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          // Arriving is the normal case. Already past is the important one: a
          // hash link or a restored scroll position can jump the reader over
          // an element entirely, and a reveal that only fires on intersection
          // would leave that element invisible for the rest of the session.
          const passed = entry.boundingClientRect.top < 0;
          if (!entry.isIntersecting && !passed) continue;
          (entry.target as HTMLElement).dataset.reveal = "true";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );

    const presence = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          (entry.target as HTMLElement).dataset.inview = entry.isIntersecting
            ? "true"
            : "false";
        }
      },
      { threshold: 0 }
    );

    revealTargets.forEach((target) => reveal.observe(target));
    presenceTargets.forEach((target) => presence.observe(target));

    /*
     * Safety net. An observer only reports threshold crossings, so a scroll
     * that jumps clean over an element — a restored position, a hash link, a
     * long fling — produces no callback at all, and the element would stay at
     * zero opacity for the rest of the session. Content that is invisible for
     * a reason no reader can see is worse than an unanimated reveal, so a
     * cheap sweep catches anything the observer missed. It removes itself the
     * moment every target has arrived, which on this page is almost at once.
     */
    const scroller = document.querySelector<HTMLElement>(
      "[data-marketing-scroller]"
    );
    let frame = 0;

    const sweep = () => {
      frame = 0;
      let remaining = 0;
      for (const target of revealTargets) {
        if (target.dataset.reveal === "true") continue;
        if (target.getBoundingClientRect().top < window.innerHeight) {
          target.dataset.reveal = "true";
          reveal.unobserve(target);
          continue;
        }
        remaining += 1;
      }
      if (remaining === 0) scroller?.removeEventListener("scroll", schedule);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };

    scroller?.addEventListener("scroll", schedule, { passive: true });

    return () => {
      reveal.disconnect();
      presence.disconnect();
      scroller?.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
