/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";

// @vibaar/design-tokens owns both this Tailwind mapping and the runtime CSS
// variables imported by globals.css. `content` + `plugins` stay app-specific.
const config: Config = {
  presets: [require("@vibaar/design-tokens/preset")],
  content: [
    // ONE glob for the whole app source, deliberately not a list of the
    // directories that happen to hold components today. The enumerated form
    // silently purged CSS twice: `./src/pages` had not existed since the App
    // Router move, while `./src/hooks` was never listed — so the address
    // picker's hover and active states (LocationModalImpl, used on both the
    // seller and buyer shipping flows) emitted no CSS at all. Nothing catches
    // that: tsc, lint and the build all pass, the classes are simply absent.
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // @vibaar/ui primitives live outside this app — scan them or their utility
    // classes get purged (unstyled UI). Kept in sync as the design-system moves.
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [require("tailwind-scrollbar-hide")],
};
export default config;
