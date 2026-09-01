import React from "react";

// Vibaar brand mark. Renders the supplied brand SVGs from /brand/ — the
// artwork is never redrawn here (the previous version inlined the old
// Instashop paths in #FE2C55, which survived the rebrand unnoticed).
//
// Geometry note: the lockup is 2721×781 and the icon 999×781. `width` drives
// the render and height is derived from the true ratio, so the mark can never
// be stretched by a caller passing a mismatched height.

const RATIO = { full: 2721 / 781, icon: 999 / 781 } as const;

interface LogoProps {
  width?: number;
  /** Ignored for sizing — height is derived from `width` to preserve the
   *  lockup's aspect ratio. Kept so existing call sites still type-check. */
  height?: number;
  className?: string;
  variant?: "icon" | "full" | "text";
  /** "white" renders the light-on-dark variant; anything else renders black. */
  textColor?: string;
}

export default function Logo({
  width = 132,
  className = "",
  variant = "full",
  textColor = "black",
}: LogoProps) {
  const isIcon = variant === "icon";
  const shape = isIcon ? "icon" : "full";
  const tone = textColor === "white" ? "white" : "black";
  const src = `/brand/${shape === "icon" ? "icon" : "logo"}-${tone}.svg`;
  const height = Math.round(width / RATIO[shape]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimisation needed
    <img
      src={src}
      alt="Vibaar"
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}
