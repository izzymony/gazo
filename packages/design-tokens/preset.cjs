/* eslint-disable @typescript-eslint/no-require-imports */
const { tokens } = require("./tokens.cjs");

const cssVariableScale = (name, scale) =>
  Object.fromEntries(
    Object.keys(scale).map((step) => [
      step,
      `rgb(var(--${name}-${step}-rgb) / <alpha-value>)`,
    ])
  );

/**
 * @vibaar/design-tokens — canonical Tailwind mapping for the values in
 * tokens.cjs. Consumers use this preset and import `tokens.css`; both outputs
 * therefore come from the same source rather than relying on an app-local copy.
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
        // Brand PALETTE plus the semantic default. `brand` with no step stays
        // the brand itself, so every existing bg-brand / text-brand keeps
        // working unchanged; the numeric steps are the new scale.
        // GENERATED — scripts/generate-brand-scale.mjs. Re-run after a rebrand.
        //
        // `brand-500` is the canonical brand colour. The generated surrounding
        // steps preserve a Tailwind-style light-to-dark API while `brand`
        // remains a compatibility alias for the same value.
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          50: "rgb(var(--brand-50-rgb) / <alpha-value>)",
          100: "rgb(var(--brand-100-rgb) / <alpha-value>)",
          200: "rgb(var(--brand-200-rgb) / <alpha-value>)",
          300: "rgb(var(--brand-300-rgb) / <alpha-value>)",
          400: "rgb(var(--brand-400-rgb) / <alpha-value>)",
          500: "rgb(var(--brand-500-rgb) / <alpha-value>)",
          600: "rgb(var(--brand-600-rgb) / <alpha-value>)",
          700: "rgb(var(--brand-700-rgb) / <alpha-value>)",
          800: "rgb(var(--brand-800-rgb) / <alpha-value>)",
          900: "rgb(var(--brand-900-rgb) / <alpha-value>)",
          950: "rgb(var(--brand-950-rgb) / <alpha-value>)",
        },
        brandHover: "rgb(var(--brand-hover-rgb) / <alpha-value>)",
        // Brand yellow carries BLACK, never white (white-on-brand = 1.28:1).
        // brandInk = foreground ON a brand surface. brandDeep = brand AS text
        // on a light surface, where the yellow itself is invisible.
        brandInk: "rgb(var(--brand-ink-rgb) / <alpha-value>)",
        brandDeep: "rgb(var(--brand-deep-rgb) / <alpha-value>)",
        // The solid black/grey half of the yellow-and-black identity. These
        // values exactly alias Tailwind neutral; CSS variables make the
        // approved scale explicit and keep /opacity support consistent.
        neutral: cssVariableScale("neutral", tokens.color.neutral),
        foreground: {
          primary: "rgb(var(--foreground-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--foreground-secondary-rgb) / <alpha-value>)",
          muted: "rgb(var(--foreground-muted-rgb) / <alpha-value>)",
          disabled: "rgb(var(--foreground-disabled-rgb) / <alpha-value>)",
          inverse: "rgb(var(--foreground-inverse-rgb) / <alpha-value>)",
        },
        outline: {
          DEFAULT: "rgb(var(--outline-default-rgb) / <alpha-value>)",
          subtle: "rgb(var(--outline-subtle-rgb) / <alpha-value>)",
          strong: "rgb(var(--outline-strong-rgb) / <alpha-value>)",
          emphasis: "rgb(var(--outline-emphasis-rgb) / <alpha-value>)",
          contrast: "rgb(var(--outline-contrast-rgb) / <alpha-value>)",
        },
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
          foreground: "rgb(var(--success-foreground-rgb) / <alpha-value>)",
          surface: "rgb(var(--success-surface-rgb) / <alpha-value>)",
          border: "rgb(var(--success-border-rgb) / <alpha-value>)",
        },
        error: {
          foreground: "rgb(var(--error-foreground-rgb) / <alpha-value>)",
          surface: "rgb(var(--error-surface-rgb) / <alpha-value>)",
          border: "rgb(var(--error-border-rgb) / <alpha-value>)",
        },
        warning: {
          foreground: "rgb(var(--warning-foreground-rgb) / <alpha-value>)",
          surface: "rgb(var(--warning-surface-rgb) / <alpha-value>)",
          border: "rgb(var(--warning-border-rgb) / <alpha-value>)",
        },
        info: {
          foreground: "rgb(var(--info-foreground-rgb) / <alpha-value>)",
          surface: "rgb(var(--info-surface-rgb) / <alpha-value>)",
          border: "rgb(var(--info-border-rgb) / <alpha-value>)",
        },
        // Compatibility alias: existing `text-black` means the historic soft
        // black. New product UI should prefer the explicit ink scale.
        black: tokens.color.ink[90],
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
      letterSpacing: {
        // Add only what Tailwind does not already provide. Declaring the full
        // scale at `theme.letterSpacing` replaced Tailwind's defaults.
        tightest: "-.075em",
      },
    },
  },
};
