/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // W4.6: components moved into features/ and design-system/ — Tailwind must
    // scan these or their utility classes get purged (unstyled UI).
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/design-system/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'hero-xl': ['180px', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'hero': ['72px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'section-title': ['64px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        'section-subtitle': ['36px', { lineHeight: '1.25', letterSpacing: '-0.03em' }],
        // W3.7 semantic type-scale (DM Sans). Each step pairs size + line-height
        // so leading travels with the token. Default text-xs/sm/base are kept;
        // the Phase-5 codemod migrates arbitrary text-[Npx] onto these.
        'display': ['40px', { lineHeight: '44px', letterSpacing: '-0.02em' }],
        'h1': ['24px', { lineHeight: '30px', letterSpacing: '-0.01em' }],
        'h2': ['18px', { lineHeight: '24px' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body': ['14px', { lineHeight: '20px' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        'caption': ['10px', { lineHeight: '14px' }],
        'micro': ['8px', { lineHeight: '12px' }],
      },
      colors: {
        // Brand — token-backed (W3.2). rgb channels keep the /opacity modifier
        // working; `bg-instaRed` renders #FE2C55 exactly as before, and a rebrand
        // is a one-line change to --brand-rgb in globals.css.
        instaRed: "rgb(var(--brand-rgb) / <alpha-value>)",
        brand: "rgb(var(--brand-rgb) / <alpha-value>)",
        brandHover: "var(--brand-hover)",
        // Ink ramp (soft blacks) + hairline — token-backed, for the W3.9 codemod.
        ink: {
          3: "var(--ink-3)",
          5: "var(--ink-5)",
          10: "var(--ink-10)",
          20: "var(--ink-20)",
          30: "var(--ink-30)",
          40: "var(--ink-40)",
          50: "var(--ink-50)",
          60: "var(--ink-60)",
          70: "var(--ink-70)",
          80: "var(--ink-80)",
          90: "var(--ink-90)",
        },
        line: "var(--line)",
        // Semantic status colors (token-backed). DEFAULT = solid fill/icon shade;
        // `strong` = deeper, text-safe shade for coloured text on light/tinted bg.
        success: { DEFAULT: "var(--success)", strong: "var(--success-strong)" },
        error: "var(--error)",
        warning: { DEFAULT: "var(--warning)", strong: "var(--warning-strong)" },
        info: "var(--info)",
        // Restore full numbered scales: a bare string clobbered green-*/red-*,
        // breaking ~45 `*-green-500` / `*-red-600` usages. Keep the brand shade
        // as DEFAULT so bare `bg-green` / `text-red` (44 usages) are unchanged.
        green: { ...colors.green, DEFAULT: "#06C270" },
        red: { ...colors.red, DEFAULT: "#CC2020" },
        // (Removed the custom gray-30/60/90 alpha steps — they duplicated the ink
        // ramp and were codemodded to `ink-*`; Tailwind's default gray scale now
        // stands unshadowed for the solid gray-100..900 usages.)
        // Soft black (90% ink) kept to avoid regressing 187 `bg-black`/`text-black`
        // usages (incl. their /opacity modifiers); true --black token available in css.
        black: "#000000E5",
        foreground: "var(--foreground)",
        landing: {
          yellow: "#F2DE4D",
          cyan: "#00DAE6",
          purple: "#F193FF",
          darkFooter: "#010A0B",
          // Professional palette
          navy: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
        },
      },
      backgroundImage: {
        'section-yellow': 'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), linear-gradient(90deg, rgb(242, 222, 77) 0%, rgb(242, 222, 77) 100%)',
        'section-cyan': 'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), linear-gradient(90deg, rgb(0, 218, 230) 0%, rgb(0, 218, 230) 100%)',
        'section-purple': 'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), linear-gradient(90deg, rgb(241, 147, 255) 0%, rgb(241, 147, 255) 100%)',
        'footer-hero': 'linear-gradient(90deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(rgba(254, 44, 85, 0) 31.929%, rgba(254, 44, 85, 0.85) 85.643%)',
      },
      // Semantic radius / elevation / z-index tokens (W3.2). New names — no
      // collision with Tailwind defaults, so existing rounded-*/shadow-*/z-* are
      // untouched. Consumed by the W3.4+ primitives.
      borderRadius: {
        field: "var(--radius-field)",
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
    },
    letterSpacing: {
      tightest: "-.075em",
      tighter: "-.05em",
      tight: "-.025em",
      normal: "0",
      wide: ".025em",
      wider: ".05em",
      widest: ".1em",
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};
export default config;
