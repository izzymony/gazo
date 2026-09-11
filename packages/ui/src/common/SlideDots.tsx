"use client";

import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

/** Named for the ground the dots sit on, as the rest of the system is. */
export type SlideDotsTone = "default" | "onBrand" | "onDark";

export interface SlideDotsProps {
  /** How many slides there are. Fewer than two renders nothing — a single
   *  slide has no position to report and no alternative to offer. */
  count: number;
  /** Index of the slide on show. */
  active: number;
  onSelect: (index: number) => void;
  /**
   * What one step is, for each button's name: "message" gives "Show message 2
   * of 4". Without it the row announces as unlabelled buttons, which is what
   * every hand-rolled version of this did.
   */
  itemLabel?: string;
  tone?: SlideDotsTone;
  className?: string;
}

const TONE: Record<SlideDotsTone, { active: string; idle: string }> = {
  default: { active: "bg-foreground-primary", idle: "bg-outline-strong" },
  onBrand: { active: "bg-brandInk/70", idle: "bg-brandInk/25" },
  onDark: { active: "bg-white", idle: "bg-white/40" },
};

/**
 * SlideDots — position and direct access within a set of slides.
 *
 * The app draws this three times and no version is operable: the marketplace
 * band, the auth slideshow and the marketing hero each render `<div onClick>`
 * dots with no role, no accessible name and no keyboard path. Four controls
 * that exist for a mouse and for nobody else.
 *
 * The dot is 6px and the button around it is 36 — the touch floor. Sizing the
 * target to the mark is what made the originals almost unhittable on a phone,
 * which is the only device most of this app's shoppers have.
 *
 * `aria-current` carries the position, so "which one am I on" survives being
 * read aloud rather than existing only as an opacity difference.
 */
export default function SlideDots({
  count,
  active,
  onSelect,
  itemLabel = "slide",
  tone = "default",
  className,
}: SlideDotsProps) {
  if (count < 2) return null;
  const styles = TONE[tone] ?? TONE.default;

  return (
    <div className={cn("-ml-1 flex items-center", className)}>
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Show ${itemLabel} ${index + 1} of ${count}`}
          aria-current={index === active ? "true" : undefined}
          className={cn("flex h-9 w-5 items-center justify-center", focusRing)}>
          <span
            className={cn(
              "size-1.5 rounded-pill transition-colors",
              index === active ? styles.active : styles.idle
            )}
          />
        </button>
      ))}
    </div>
  );
}
