import Image from "next/image";
import { cn } from "@vibaar/utils";

/** Which mark to use for the ground it sits on. */
export type BrandLogoTone = "black" | "white" | "yellow";

const SRC: Record<BrandLogoTone, string> = {
  black: "/brand/logo-black.svg",
  white: "/brand/logo-white.svg",
  yellow: "/brand/logo-yellow.svg",
};

// The mark's intrinsic aspect ratio. Height is derived from width so a caller
// can never squash it by setting one and forgetting the other — which is how
// the same logo ended up at four different ratios across the app.
const ASPECT = 135.5 / 39;

export interface BrandLogoProps {
  /** Mark for the ground it sits on. Black on light, white on dark/imagery. */
  tone?: BrandLogoTone;
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
  width = 135.5,
  className,
  alt = "Vibaar",
}: BrandLogoProps) {
  return (
    <Image
      src={SRC[tone]}
      alt={alt}
      width={width}
      height={Math.round((width / ASPECT) * 100) / 100}
      className={cn("h-auto", className)}
    />
  );
}
