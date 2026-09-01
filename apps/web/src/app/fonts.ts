import localFont from "next/font/local";

// ONE family for the whole app: Outfit. Geometric, single-storey `a` — the
// same letterform as the vibaar wordmark, so the UI descends from the logo.
// Its weight range covers display and body, so no secondary family is needed.
//
// Self-hosted via next/font/local — never `next/font/google`. A build-time
// Google fetch made builds network-fragile, which is what F3/P0b removed.
export const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-outfit",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});
