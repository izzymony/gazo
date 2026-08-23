"use client";

interface BackButtonProps {
  /** Click handler (e.g. router.back()) */
  onClick?: () => void;
  /** Unique SVG mask id — preserved per-caller so the rendered DOM is byte-for-byte identical */
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
const BackButton = ({ onClick, maskId, className }: BackButtonProps) => (
  <div onClick={onClick} className={className}>
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
        <rect x="8" y="8" width="20" height="20" fill="#D9D9D9" />
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
  </div>
);

export default BackButton;
