"use client";

import { useSyncExternalStore } from "react";

/** No server-side subscription exists, and none is needed: the value flips once. */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` while rendering on the server and during the hydration pass, `true`
 * afterwards. Use it to keep something OUT of the server HTML.
 *
 * ## Why this is needed, specifically
 *
 * `/signin`, `/signup` and `/forgot-password` are prerendered, and one
 * prerendered document is served for every query string. `step` also starts at
 * `useState(0)` with the URL applied in an effect, so the emitted HTML is
 * always step zero — the landing, with its artwork.
 *
 * Measured on `/signin?step=1`: the served HTML is byte-identical to the
 * landing's, 16 `<img>` elements and 8 `rel="preload"` links. A phone opening a
 * password step therefore downloads the whole landing composition before any
 * JavaScript runs. Deriving `step` during render instead of in an effect does
 * not fix it, because the document was already written without knowing the
 * query; and the browser has fetched those images before React exists.
 *
 * So the artwork cannot be in the prerendered HTML at all. That is the whole
 * reason this hook exists, and the cost is stated plainly: the scene artwork is
 * requested after hydration rather than during parse. It is confined to the
 * auth scene panel — `/welcome`'s hero is a plain `<Image priority>` that still
 * server-renders, so the one genuinely above-the-fold landing image is
 * unaffected.
 *
 * The alternative is to render these routes dynamically so the server can see
 * `?step=`, which keeps the parse-time fetch and costs the static prerender
 * instead. That is a deployment-shaped decision, not a component one.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: it gives React
 * the server snapshot explicitly, so hydration matches by construction instead
 * of by a mismatch that React patches up.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useIsHydrated;
