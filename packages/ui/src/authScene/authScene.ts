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
  /** The fallback, and the widest derivative. */
  src: string;
  /**
   * Candidate widths, and the layout width to choose between them.
   *
   * Carried by the DATA rather than built in the renderer, because the app owns
   * how its assets are named and `@vibaar/ui` should not. More importantly they
   * are one value with two consumers: this image, and the parse-time
   * `<link rel="preload">` in the `(auth)` layout, whose `imagesrcset` and
   * `imagesizes` must resolve to the SAME candidate or the file downloads
   * twice. One source of truth is what stops that drifting.
   */
  srcSet: string;
  sizes: string;
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

/**
 * The overhanging corner mark, or nothing.
 *
 * A closed key for the same reason the icon is one. NOT derived from `kind` and
 * `tone`: "New order · ₦24,500" and "Funds released · ₦22,800" are both
 * `event` + `brand` + carrying a value, and they deliberately want different
 * marks — one is a thing arriving, the other is a thing completing. A rule that
 * is wrong for two of the six overlays is not a rule.
 *
 * Exactly two ship, and they are the whole of the panel's semantic colour:
 * `tag` is brand yellow for a new commercial event, `check` is success green
 * for a completion. The card bodies stay neutral glass.
 */
export type AuthOverlayBadge = "check" | "tag";

interface AuthOverlayBase {
  placement: AuthOverlayPlacement;
  tone?: AuthOverlayTone;
  badge?: AuthOverlayBadge;
}

/**
 * A thing that happened, with a number attached — "New order · ₦24,500 · 2
 * items". The number is the point, so it gets its own slot.
 */
export interface AuthEventOverlay extends AuthOverlayBase {
  kind: "event";
  icon: AuthSceneIconKey;
  title: string;
  value?: string;
  metadata?: string;
}

/** A state the seller is now in — "Payment secured", "Store is live". */
export interface AuthStatusOverlay extends AuthOverlayBase {
  kind: "status";
  icon: AuthSceneIconKey;
  title: string;
  description?: string;
  tone: Extract<AuthOverlayTone, "brand" | "success">;
}

/**
 * One phrase, no icon, no badge — the composition's smallest object.
 *
 * `icon` moved off the base so this can exist without one: required where it is
 * used, absent where it is not, rather than optional everywhere.
 */
export interface AuthChipOverlay extends AuthOverlayBase {
  kind: "chip";
  label: string;
}

export type AuthOverlay = AuthEventOverlay | AuthStatusOverlay | AuthChipOverlay;

export interface AuthScene {
  id: AuthSceneId;
  /** The step marker — "01 · Discover". Persistent, not rotating copy. */
  label: string;
  headline: string;
  description: string;
  image: AuthSceneImage;
  /**
   * Two cards, and at most one chip where it adds meaning.
   *
   * Not a ceiling picked for tidiness. The artwork is editorial and already
   * detailed, so each element added is competing with it rather than with
   * empty space — the retired design's density belonged to flatter
   * photography. The chip is `optional`, so constrained panes show two.
   */
  overlays: readonly AuthOverlay[];
}
