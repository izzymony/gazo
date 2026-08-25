import localFont from "next/font/local";

// Self-hosted DM Sans (F3). Replaces next/font/google so `next build` never
// fetches from Google Fonts at build time (which made builds network-fragile).
// The variable woff2 covers weights 400–700; latin subset matches the app's
// prior `subsets: ["latin"]`. One loader for the whole app (was two).
export const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-dm-sans",
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});
