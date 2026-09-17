/**
 * The auth slideshow's data contract. Types only — no data, no JSX.
 *
 * `slidesData.tsx` was the counter-example: it carried styled `<p>` elements
 * with hard `<br />`s, which is why a data module had to be a `.tsx`, why the
 * copy could not be measured or localised without editing markup, and why the
 * same three class strings were repeated three times. Nothing here admits a
 * ReactNode. Icons are named by a closed key and resolved by the renderer.
 */

/** The three scenes, in narrative order: discovery, order, delivery. */
export type AuthSceneId = "discover" | "order" | "deliver";

/**
 * Where the artwork's subject is, as a fraction of the image on each axis.
 *
 * Numbers rather than an `object-position` string so the values can be
 * validated (0–1) and interpolated. Three breakpoints because the panel's
 * aspect changes a lot: a tall mobile band, a narrow compact pane, and a wide
 * desktop one crop the same scene very differently.
 */
export interface AuthSceneFocal {
  x: number;
  y: number;
}

export interface AuthSceneFocalPoints {
  mobile: AuthSceneFocal;
  compact: AuthSceneFocal;
  desktop: AuthSceneFocal;
}

export interface AuthSceneImage {
  /** The asset slot this scene draws from. Mirrors the scene id by design. */
  slot: `auth-${AuthSceneId}`;
  src: string;
  /** Intrinsic dimensions. Required so the pane can reserve its box. */
  width: number;
  height: number;
  /**
   * Describes the artwork.
   *
   * The panel renders `alt=""` and hides the image from assistive tech — the
   * caption carries the meaning in words that are already in the a11y tree, so
   * an alt here would say everything twice. The field is still required: it is
   * what stops an asset shipping that nobody has looked at and described, and a
   * data test asserts it is present and substantial.
   */
  alt: string;
  focal: AuthSceneFocalPoints;
}

/** Semantic weight. `brand` is the product acting; `success` is it succeeding. */
export type AuthOverlayTone = "brand" | "success" | "neutral";

/**
 * How hard an overlay fights for space.
 *
 * `primary` is always shown. `secondary` may shrink within bounds. `optional`
 * is dropped entirely on a constrained panel — a 344px pane at 768 cannot hold
 * three cards without them overlapping the subject or each other.
 */
export type AuthOverlayPriority = "primary" | "secondary" | "optional";

/** Which corner of the card sits at its placement coordinate. */
export type AuthOverlayAnchor =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface AuthOverlayPlacement {
  /** Fraction of the media container's width, 0–1. Never a pixel. */
  x: number;
  /** Fraction of the media container's height, 0–1. */
  y: number;
  anchor: AuthOverlayAnchor;
  priority: AuthOverlayPriority;
}

/**
 * Icons are named, not passed.
 *
 * A closed key keeps the scene data a plain `.ts` module and keeps the icon
 * choice reviewable in one place instead of spread across three data literals.
 */
export type AuthSceneIconKey =
  | "store"
  | "saved"
  | "order"
  | "payment"
  | "delivered"
  | "confirmed"
  | "payout";

interface AuthOverlayBase {
  placement: AuthOverlayPlacement;
  icon: AuthSceneIconKey;
  tone?: AuthOverlayTone;
}

/**
 * A thing that happened, with a number attached — "New order · ₦24,500 · 2
 * items". The number is the point, so it gets its own slot.
 */
export interface AuthEventOverlay extends AuthOverlayBase {
  kind: "event";
  title: string;
  value?: string;
  metadata?: string;
}

/** A state the seller is now in — "Payment secured", "Store is live". */
export interface AuthStatusOverlay extends AuthOverlayBase {
  kind: "status";
  title: string;
  description?: string;
  tone: Extract<AuthOverlayTone, "brand" | "success">;
}

export type AuthOverlay = AuthEventOverlay | AuthStatusOverlay;

export interface AuthScene {
  id: AuthSceneId;
  /** The step marker — "01 · Discover". Persistent, not rotating copy. */
  label: string;
  headline: string;
  description: string;
  image: AuthSceneImage;
  /** At most three. Two reads better; the third is `optional` for a reason. */
  overlays: readonly AuthOverlay[];
}

/** The line that holds across all three scenes. */
export const AUTH_SCENE_STRAPLINE = "From attention to income";
