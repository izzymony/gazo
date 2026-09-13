/**
 * The canvas these coordinates are drawn on. Nothing renders at this size — it
 * is the denominator that turns the numbers below into fractions, which CSS
 * then multiplies by the real pane. Cards spread ±289.5 from the centre, so the
 * composition is 1.287 canvases wide; `.composition-canvas` sizes itself to
 * keep that inside its container on both axes.
 */
export const COMPOSITION_CANVAS = 450;

export interface ImageProps {
  src: string;
  /** Intrinsic size, for next/image. Rendered size comes from `position`. */
  width: number;
  height: number;
  /**
   * Offset from the canvas centre, in canvas units.
   *
   * There used to be two of these — `position` for mobile and
   * `desktopPosition` — chosen at runtime by `window.innerWidth >= 768`. Every
   * one of the nine pairs was the same ratio (`position = desktopPosition ×
   * 0.667`), the same constant as the mobile card scale, so the fork was one
   * composition expressed twice. It is now expressed once and scaled by CSS,
   * which also fixes the half of it nothing covered: the branch was read inside
   * an animation callback with no resize listener, so rotating a tablet left
   * the artwork on the wrong geometry until the next slide.
   */
  position?: { x: number; y: number };
  animation?: {
    /** Float amplitude, also in canvas units, so it scales with everything else. */
    floatHeight?: number;
    floatDuration?: number;
  };
}

export interface Slide {
  background: string;
  images: ImageProps[];
  title: string;
  description: React.ReactNode;
}

export const slidesData: Slide[] = [
  {
    background: "/Frame 1618869220.png",
    images: [
      {
        src: "/Frame 1618869207.webp",
        width: 217,
        height: 61.5,
        position: { x: -165, y: -60 },
        animation: { floatHeight: 10, floatDuration: 4000 },
      },
      {
        src: "/Frame 1618869205.svg",
        width: 232,
        height: 61.5,
        position: { x: -165, y: 90 },
        animation: { floatHeight: 15, floatDuration: 4500 },
      },
      {
        src: "/Frame 1618869208 (1).svg",
        width: 249,
        height: 61.5,
        position: { x: 165, y: 15 },
        animation: { floatHeight: 8, floatDuration: 3800 },
      },
      {
        src: "/Frame 1618869209.svg",
        width: 228,
        height: 61.5,
        position: { x: 165, y: 135 },
        animation: { floatHeight: 12, floatDuration: 4200 },
      },
    ],
    title: "Sell More. Grow Faster.",
    description: (
      <p className="text-xs md:text-body-lg font-normal text-foreground-primary">
        Transform your IG or TikTok into a smart storefront. <br />
        Payments, delivery & insights—all in one place.
      </p>
    ),
  },
  {
    background: "/Frame 1618869221.png",
    images: [
      {
        src: "/Frame 1618869215.svg",
        width: 217,
        height: 61,
        position: { x: 165, y: 127 },
      },
      {
        src: "/Frame 1618869216.webp",
        width: 232,
        height: 41,
        position: { x: -165, y: 30 },
      },
      {
        src: "/Frame 1618869214.webp",
        width: 195,
        height: 41,
        position: { x: 165, y: -60 },
      },
    ],
    title: "Shop safer, without fear.",
    description: (
      <p className="text-xs md:text-body-lg font-normal text-foreground-primary">
        Discover trusted vendors with secure checkout, <br />
        refund support, and verified ratings.
      </p>
    ),
  },
  {
    background: "/Frame 1618869222.webp",
    images: [
      {
        src: "/Frame 1618869023.svg",
        width: 217,
        height: 61.5,
        position: { x: -172, y: -30 },
      },
      {
        src: "/Frame 1618869141.svg",
        width: 232,
        height: 61.5,
        position: { x: 165, y: 120 },
      },
    ],
    title: "Track Every Order Instantly.",
    description: (
      <p className="text-xs md:text-body-lg font-normal text-foreground-primary">
        Real-time delivery tracking and fast, affordable <br />
        shipping — no more stress
      </p>
    ),
  },
];
