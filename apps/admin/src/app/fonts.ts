import localFont from "next/font/local";

// Self-hosted DM Sans (P0b) — mirrors apps/web so the admin build never fetches
// Google Fonts at build time (which failed the build until network was allowed).
export const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-dm-sans",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});
