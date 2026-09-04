/* eslint-disable @typescript-eslint/no-require-imports */
const colors = require("tailwindcss/colors");

/**
 * @vibaar/design-tokens — canonical Tailwind token theme (extracted verbatim from
 * web's tailwind.config.ts, M1). Consumers spread this via `presets: [...]`.
 * The CSS custom properties it references (--brand-rgb, --ink-*, --success,
 * --radius-*, --shadow-*, --z-*, …) must be provided by the consumer's global
 * stylesheet (web: src/styles/globals.css). Admin adopts this at M5.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        // ONE family — Outfit covers display and body. `display`/`body` are
        // kept as aliases so existing font-display usages keep working.
        sans: ['var(--font-outfit)', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-outfit)', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['var(--font-outfit)', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontWeight: {
        // Outfit reads thin at 400 in UI; the scale starts a step up.
        normal: '450',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontSize: {
        'hero-xl': ['180px', { lineHeight: '1', letterSpacing: '-0.04em' }],
        'hero': ['72px', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'section-title': ['64px', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        'section-subtitle': ['36px', { lineHeight: '1.25', letterSpacing: '-0.03em' }],
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
        brand: "rgb(var(--brand-rgb) / <alpha-value>)",
        brandHover: "rgb(var(--brand-hover-rgb) / <alpha-value>)",
        // Brand yellow carries BLACK, never white (white-on-brand = 1.28:1).
        // brandInk = foreground ON a brand surface. brandDeep = brand AS text
        // on a light surface, where the yellow itself is invisible.
        brandInk: "rgb(var(--brand-ink-rgb) / <alpha-value>)",
        brandDeep: "rgb(var(--brand-deep-rgb) / <alpha-value>)",
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
        // Declared with an <alpha-value> slot, NOT a bare var(): Tailwind can
        // only generate a /opacity modifier for the former. As bare vars,
        // bg-success/10, bg-warning/10, text-brandInk/70 and friends emitted no
        // CSS at all — 31 dead utilities across the app, invisible to
        // tsc/lint/build. `ink-*` is deliberately NOT converted: those tokens
        // are already alpha (--ink-50 is 50% black), so a modifier would
        // compound into a silent double-dim rather than fail loudly.
        success: {
          DEFAULT: "rgb(var(--success-rgb) / <alpha-value>)",
          strong: "rgb(var(--success-strong-rgb) / <alpha-value>)",
        },
        error: "rgb(var(--error-rgb) / <alpha-value>)",
        warning: {
          DEFAULT: "rgb(var(--warning-rgb) / <alpha-value>)",
          strong: "rgb(var(--warning-strong-rgb) / <alpha-value>)",
        },
        info: "rgb(var(--info-rgb) / <alpha-value>)",
        green: { ...colors.green, DEFAULT: "#06C270" },
        red: { ...colors.red, DEFAULT: "#CC2020" },
        black: "#000000E5",
        landing: {
          yellow: "#F2DE4D",
          cyan: "#00DAE6",
          purple: "#F193FF",
          darkFooter: "#010A0B",
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
};
