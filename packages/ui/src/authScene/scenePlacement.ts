import type { CSSProperties } from "react";

/**
 * The only place in this directory that builds a style object.
 *
 * Overlay coordinates and image focal points are open per-instance numbers, so
 * they cannot be classes — a `.scene-x-24` grid would be the "one composition
 * expressed twice" problem that the fractional system replaced, and
 * `left-[calc(var(--overlay-x)*100%)]` is an arbitrary utility, which in a new
 * file is a new drift fingerprint and fails the ratchet. So they travel as CSS
 * custom properties, and the preset's `.scene-*` utilities do the arithmetic.
 *
 * ## Why two helpers and not one
 *
 * The brief proposed a single `scenePlacementStyle({ x, y, index, focalX,
 * focalY, focalXMd, focalYMd })`. Two helpers are tighter, which was the point
 * of asking for a closed input: the two consumers use disjoint fields — an
 * overlay never has a focal point, an image never has a stagger index — so one
 * signature would mean every call site passing `undefined` for half of it, and
 * a type that cannot say "exactly one of these two groups". Here every field of
 * each helper is required, and neither can express the other's shape.
 *
 * Both return `CSSProperties` containing ONLY enumerated `--scene-*` /
 * `--overlay-*` properties. They cannot emit a colour, a length, a font or any
 * other declaration, which is the property that makes this indirection
 * narrower than the rule it steps around rather than a way past it. A source
 * guard in the tests asserts nothing else in this directory writes `style=`.
 */

/** Position and entrance order for one overlay. All fractions of the pane. */
export interface OverlayPlacementVars {
  /** 0–1 across the media container, on the split pane. */
  x: number;
  /** 0–1 down the media container, on the split pane. */
  y: number;
  /** The same, for the stacked band — a different composition, not a scaled one. */
  mobileX: number;
  mobileY: number;
  /** Entrance order, from 0. Multiplied by the stagger to make a delay. */
  index: number;
}

export function overlayPlacementStyle({
  x,
  y,
  mobileX,
  mobileY,
  index,
}: OverlayPlacementVars): CSSProperties {
  return {
    "--overlay-x": x,
    "--overlay-y": y,
    "--overlay-x-mobile": mobileX,
    "--overlay-y-mobile": mobileY,
    "--overlay-index": index,
  } as CSSProperties;
}

/**
 * Where the artwork's subject sits, per breakpoint.
 *
 * `compact` and `desktop` are separate because the pane's aspect changes so
 * much between them — 344×952 at 768 against 928×836 at 1440 — that one focal
 * point cannot serve both without cropping the subject out of one.
 */
export interface SceneFocalVars {
  x: number;
  y: number;
  compactX: number;
  compactY: number;
  desktopX: number;
  desktopY: number;
}

export function sceneFocalStyle({
  x,
  y,
  compactX,
  compactY,
  desktopX,
  desktopY,
}: SceneFocalVars): CSSProperties {
  return {
    "--scene-focal-x": x,
    "--scene-focal-y": y,
    "--scene-focal-x-compact": compactX,
    "--scene-focal-y-compact": compactY,
    "--scene-focal-x-desktop": desktopX,
    "--scene-focal-y-desktop": desktopY,
  } as CSSProperties;
}
