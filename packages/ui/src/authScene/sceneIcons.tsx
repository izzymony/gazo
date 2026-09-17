import type { ComponentType } from "react";
import {
  Bank,
  CircleCheck,
  HeartFilled,
  PackageSolid,
  ShoppingBag,
  Store,
  Wallet,
} from "../icons";
import type { AuthSceneIconKey } from "./authScene";

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
 * the full `IconProps`, but a few — `HeartFilled`, `PackageSolid` — are
 * hand-authored SVGs with a narrower signature. Typing the map to one of them
 * excludes the other, and the map only ever calls `size` and `className`.
 */
type SceneIcon = ComponentType<{ size?: number; className?: string }>;

export const SCENE_ICONS: Record<AuthSceneIconKey, SceneIcon> = {
  store: Store,
  saved: HeartFilled,
  order: ShoppingBag,
  payment: Wallet,
  // Filled, because it reads as a completed thing rather than an outline of
  // one — the same reason the nav uses a solid glyph for the active tab.
  delivered: PackageSolid,
  confirmed: CircleCheck,
  payout: Bank,
};
