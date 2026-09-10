"use client";

import type { ComponentType } from "react";
import { cn } from "@vibaar/utils";
import type { IconProps } from "../icons";

/** A filled companion glyph: same signature as the icon module's solid glyphs. */
type SolidGlyph = ComponentType<{ size?: number; className?: string }>;

export interface NavGlyphProps {
  /** The outline glyph, drawn in both states. */
  icon: ComponentType<IconProps>;
  /**
   * Bespoke filled artwork, for glyphs whose outline paths do not close — the
   * cart and the package. Everything else fills correctly from its own paths.
   */
  solid?: SolidGlyph;
  /** Marks the destination the viewer is on. Idle renders the outline alone. */
  active?: boolean;
  size?: number;
  className?: string;
}

/**
 * The artwork for one navigation destination, selected or not.
 *
 * A nav bar's whole job is to say which destination you are on, and colour
 * alone was not saying it: on the seller bar an active tab differed from an
 * idle one by nothing but a change of grey to olive, and on the buyer bar the
 * tinted pill behind it measured about 1.1:1 against its own container. So the
 * selected glyph goes solid — brand yellow poured into the shape, with the deep
 * outline still drawn over the top, and the fill nudged a pixel to the left so
 * the two layers read as deliberately mis-registered rather than as a glyph
 * that failed to line up with itself.
 *
 * It renders as `NavItem`'s `icon`, which takes a node precisely so that a
 * caller can hand over artwork differing between states without the nav item
 * needing to know such a distinction exists. Both mobile bars pass this.
 *
 * Only the fill layer names a colour. The outline inherits `currentColor` from
 * the nav item's own active class, so a bar that changes its active text token
 * changes the glyph with it and the two cannot drift apart.
 */
export default function NavGlyph({
  icon: Icon,
  solid: Solid,
  active = false,
  size = 24,
  className,
}: NavGlyphProps) {
  if (!active) {
    return <Icon className={className} size={size} />;
  }

  // Positioned rather than sized: the outline stays in flow and gives the
  // wrapper its box, so the two layers cannot disagree about how big the
  // glyph is, and no width has to be restated in a style attribute.
  const fillLayer = "absolute left-0 top-0 -translate-x-px text-brand";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {Solid ? (
        <Solid className={fillLayer} size={size} />
      ) : (
        // `fill` overrides the icon set's own fill="none" on the svg, and the
        // paths carry no fill of their own, so they inherit it. strokeWidth
        // makes the set stroke in currentColor too, which spreads the shape far
        // enough to sit under the outline rather than peek out around it.
        <Icon className={fillLayer} fill="currentColor" size={size} strokeWidth={2.6} />
      )}
      <Icon className="relative" size={size} />
    </span>
  );
}
