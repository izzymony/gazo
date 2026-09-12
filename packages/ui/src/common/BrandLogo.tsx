import Image from "next/image";
import { cn } from "@vibaar/utils";

/** Which mark to use for the ground it sits on. */
export type BrandLogoTone = "black" | "white" | "yellow";

/**
 * `wordmark` is the full lockup. `mark` is the glyph alone, for somewhere too
 * narrow to read a word — a collapsed navigation column, a favicon-sized slot.
 */
export type BrandLogoShape = "wordmark" | "mark";

const SRC: Record<BrandLogoShape, Record<BrandLogoTone, string>> = {
  wordmark: {
    black: "/brand/logo-black.svg",
    white: "/brand/logo-white.svg",
    yellow: "/brand/logo-yellow.svg",
  },
  mark: {
    black: "/brand/icon-black.svg",
    white: "/brand/icon-white.svg",
    yellow: "/brand/icon-yellow.svg",
  },
};

// Intrinsic aspect ratios. Height is derived from width so a caller can never
// squash the artwork by setting one and forgetting the other — which is how the
// same logo ended up at four different ratios across the app.
//
// PER SHAPE, and that matters: the mark is 999x781, nothing like the lockup's
// 135.5x39, so a single constant would have flattened it.
const ASPECT: Record<BrandLogoShape, number> = {
  wordmark: 135.5 / 39,
  mark: 999 / 781,
};

export interface BrandLogoProps {
  /** Mark for the ground it sits on. Black on light, white on dark/imagery. */
  tone?: BrandLogoTone;
  /** Full lockup, or the glyph alone where there is no room for a word. */
  shape?: BrandLogoShape;
  /** Rendered width in px. Height follows the mark's own ratio. */
  width?: number;
  className?: string;
  /**
   * Accessible name. Defaults to "Vibaar". Pass "" when the logo is decorative
   * because an adjacent element already names the destination — a logo inside a
   * labelled home link would otherwise be announced twice.
   */
  alt?: string;
}

/**
 * BrandLogo — the brand mark.
 *
 * The mark was inlined as a raw `next/image` in ten places across three tones,
 * each restating the file path and its dimensions, so a rebrand meant finding
 * every one of them. Tone is named for the ground it sits on rather than by
 * filename, so call sites say what they mean.
 */
export default function BrandLogo({
  tone = "black",
  shape = "wordmark",
  width = 135.5,
  className,
  alt = "Vibaar",
}: BrandLogoProps) {
  return (
    <Image
      src={SRC[shape][tone]}
      alt={alt}
      width={width}
      height={Math.round((width / ASPECT[shape]) * 100) / 100}
      className={cn("h-auto", className)}
    />
  );
}
