import localFont from "next/font/local";

// Self-hosted brand faces (F3/P0b). Never `next/font/google` — a build-time
// Google fetch made builds network-fragile and is what F3 removed.
//
// Outfit — display / headings. Geometric with a single-storey `a`, the same
// letterform the vibaar wordmark uses, so headings descend from the logo.
export const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

// IBM Plex Sans — body. Drawn as a technical family; shares skeletons with
// Plex Mono, so data and prose sit together without a seam.
export const plexSans = localFont({
  src: "./fonts/plex-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});
