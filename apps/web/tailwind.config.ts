/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";

// @vibaar/design-tokens owns both this Tailwind mapping and the runtime CSS
// variables imported by globals.css. `content` + `plugins` stay app-specific.
const config: Config = {
  presets: [require("@vibaar/design-tokens/preset")],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // W4.6: components moved into features/ and design-system/ — Tailwind must
    // scan these or their utility classes get purged (unstyled UI).
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/design-system/**/*.{js,ts,jsx,tsx,mdx}",
    // @vibaar/ui primitives live outside this app — scan them or their utility
    // classes get purged (unstyled UI). Kept in sync as the design-system moves.
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [require("tailwind-scrollbar-hide")],
};
export default config;
