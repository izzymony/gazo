"use client";

import useMediaQuery from "./useMediaQuery";

/**
 * Does the visitor want motion kept to a minimum?
 *
 * There is already a blanket CSS rule for this in the app
 * (`globals.css`: `* { animation-duration: .01ms !important; transition-duration:
 * .01ms !important }`), and it is not enough — in two specific ways that this
 * hook exists to cover:
 *
 *  1. `animation-duration` and `animation-iteration-count` are CSS-animation
 *     longhands. They have NO effect on a Web Animations API animation. The
 *     auth slideshow's floating cards are `el.animate(…, { iterations:
 *     Infinity })`, so they kept bobbing at full amplitude under the rule that
 *     was supposed to stop them.
 *  2. No CSS rule can stop a slideshow ADVANCING. Reducing motion means content
 *     should not change on its own either, and that decision lives in a timer.
 *
 * Server snapshot is `false` — i.e. assume motion is fine until the client says
 * otherwise. That is the safe direction here rather than the polite one: the
 * artwork must stay server-renderable (an auth pane that waits for a
 * client-only query would blank the first paint), and for the users this
 * protects the blanket CSS rule has already neutered every transition before
 * hydration. The hook then reaches the true value on the first client commit
 * and stops the things CSS cannot reach.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}

export default usePrefersReducedMotion;
