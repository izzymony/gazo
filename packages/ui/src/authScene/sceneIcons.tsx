import type { ComponentType } from "react";
import {
  Bank,
  CircleCheck,
  Check,
  HeartFilled,
  Package,
  ShoppingBag,
  Tag,
  Store,
  Wallet,
} from "../icons";
import type { AuthOverlayBadge, AuthSceneIconKey } from "./authScene";

/**
 * Icon key → glyph.
 *
 * The scene data names an icon; it does not carry one. That keeps the data a
 * plain `.ts` module — `slidesData.tsx` had to be `.tsx` because it embedded
 * JSX, and that is what made its copy impossible to measure or localise
 * without editing markup.
 *
 * It also puts every icon choice on one screen, where "is the delivered glyph
 * the same one the orders list uses?" is answerable. The previous equivalent
 * was `ActivityItem`'s 40-entry map of `public/` SVG PATHS, where a typo
 * rendered nothing and a glyph could not take a token colour.
 */
/**
 * Deliberately permissive. Most glyphs come from the `make()` factory and take
 * the full `IconProps`, but `HeartFilled` is a hand-authored SVG with a
 * narrower signature. Typing the map to either one excludes the other, and the
 * map only ever calls `size` and `className`.
 */
type SceneIcon = ComponentType<{ size?: number; className?: string }>;

export const SCENE_ICONS: Record<AuthSceneIconKey, SceneIcon> = {
  store: Store,
  saved: HeartFilled,
  order: ShoppingBag,
  payment: Wallet,
  // Outline, not `PackageSolid`. The filled glyph was chosen to read as a
  // completed thing, the way the nav's active tab does — but at the 16px these
  // cards use it collapses into a dark blob, and it was the only solid glyph
  // among six outlines, so it read as a rendering fault rather than emphasis.
  // "Delivered" is carried by the word and the success tint.
  delivered: Package,
  confirmed: CircleCheck,
  payout: Bank,
};

/**
 * Badge key → glyph and chrome.
 *
 * Here rather than in a new module because this file's whole job is to put
 * every icon choice on one screen, and a two-entry map does not justify a
 * registry entry of its own.
 *
 * Solid, not glass — it is the one element that has to read instantly, and it
 * carries the panel's entire semantic palette. `brand` takes `brandInk`
 * (near-black) and never white: white on the brand yellow is 1.28:1.
 */
export const SCENE_BADGES: Record<AuthOverlayBadge, { Icon: SceneIcon; chrome: string }> = {
  check: { Icon: Check, chrome: "bg-success-foreground text-white" },
  // Blue, not brand yellow. The artwork is warm and yellow-dominant — the three
  // scenes mean rgb(228,195,155) — so a yellow badge on it vanished, which the
  // first capture showed plainly. Blue is the only mark that separates from
  // this set, and it is what the reference used for its own money badge.
  tag: { Icon: Tag, chrome: "bg-info-foreground text-white" },
};
