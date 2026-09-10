"use client";

import { cn } from "@vibaar/utils";

interface BackButtonProps {
  /** Click handler (e.g. router.back()) */
  onClick?: () => void;
  /** Accessible name. Defaults to "Go back". */
  ariaLabel?: string;
  /** Unique SVG mask id — masks are document-global, so two on one page must differ. */
  maskId: string;
  /** Optional wrapper className (callers currently pass none) */
  className?: string;
}

/**
 * Plain white masked-arrow back button (div wrapper variant).
 * Extracted verbatim from SmallHeader + ProductHeader (W3.7 Phase 2).
 *
 * NOTE: This is ONLY the "plain white arrow in a bare div" variant.
 * Header (a <button> with a two-tone white/black arrow) and VendorHeader
 * (arrow over a translucent circle) are visually different and intentionally
 * NOT consolidated here.
 */
const BackButton = ({ onClick, maskId, className, ariaLabel = "Go back" }: BackButtonProps) => (
  // Was a <div onClick>: not focusable, no role, and ignoring Enter and Space —
  // so the back affordance on the storefront and product headers was
  // mouse-only. The wrapper is bare either way, so this is visually identical.
  <button
    type="button"
    onClick={onClick}
    aria-label={ariaLabel}
    className={cn(
      "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1",
      className
    )}>
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="8"
        y="8"
        width="20"
        height="20">
        {/* A mask is LUMINANCE: white reveals, black hides. This was `currentColor`,
            which inherits the surrounding TEXT colour — dark on these headers — so
            the mask went black and hid the arrow entirely. Both storefront headers
            rendered an invisible back button. It must be an explicit light value. */}
        <rect x="8" y="8" width="20" height="20" fill="white" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          d="M23.832 18.0013H12.1654M12.1654 18.0013L17.9987 12.168M12.1654 18.0013L17.9987 23.8346"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  </button>
);

export default BackButton;
