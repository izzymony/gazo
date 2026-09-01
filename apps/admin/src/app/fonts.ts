import localFont from "next/font/local";

// Self-hosted brand faces — mirrors apps/web/src/app/fonts.ts (P0b).
// Never `next/font/google`: a build-time Google fetch made builds
// network-fragile, which is what F3/P0b removed.

// Outfit — display / headings. Geometric with a single-storey `a`, matching
// the vibaar wordmark, so headings descend from the logo.
export const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

// IBM Plex Sans — body.
export const plexSans = localFont({
  src: "./fonts/plex-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});
