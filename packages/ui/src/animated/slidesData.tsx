export interface ImageProps {
  src: string;
  width: number;
  height: number;
  position?: { x: number; y: number };
  desktopPosition?: { x: number; y: number };
  animation?: {
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
        position: { x: -110, y: -40 },
        desktopPosition: { x: -165, y: -60 },
        animation: { floatHeight: 10, floatDuration: 4000 },
      },
      {
        src: "/Frame 1618869205.svg",
        width: 232,
        height: 61.5,
        position: { x: -110, y: 60 },
        desktopPosition: { x: -165, y: 90 },
        animation: { floatHeight: 15, floatDuration: 4500 },
      },
      {
        src: "/Frame 1618869208 (1).svg",
        width: 249,
        height: 61.5,
        position: { x: 110, y: 10 },
        desktopPosition: { x: 165, y: 15 },
        animation: { floatHeight: 8, floatDuration: 3800 },
      },
      {
        src: "/Frame 1618869209.svg",
        width: 228,
        height: 61.5,
        position: { x: 110, y: 90 },
        desktopPosition: { x: 165, y: 135 },
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
        position: { x: 110, y: 85 },
        desktopPosition: { x: 165, y: 127 },
      },
      {
        src: "/Frame 1618869216.webp",
        width: 232,
        height: 41,
        position: { x: -110, y: 20 },
        desktopPosition: { x: -165, y: 30 },
      },
      {
        src: "/Frame 1618869214.webp",
        width: 195,
        height: 41,
        position: { x: 110, y: -40 },
        desktopPosition: { x: 165, y: -60 },
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
        position: { x: -115, y: -20 },
        desktopPosition: { x: -172, y: -30 },
      },
      {
        src: "/Frame 1618869141.svg",
        width: 232,
        height: 61.5,
        position: { x: 110, y: 80 },
        desktopPosition: { x: 165, y: 120 },
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
