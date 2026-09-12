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
 * Map a family of tones (`{ success: { foreground, surface, ... } }`) onto the
 * CSS variables tokens.cjs emits for them. Declared with an `<alpha-value>`
 * slot, never a bare `var()` — see the note on the colours block below.
 */
const toneScale = (tones, prefix = "") =>
  Object.fromEntries(
    Object.entries(tones).map(([tone, roles]) => [
      tone,
      Object.fromEntries(
        Object.keys(roles).map((role) => {
          // Both the Tailwind key and the variable are kebab, so the utility
          // reads `bg-success-surface-strong` — matching `bg-surface-strong`.
          const key = role.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
          return [key, `rgb(var(--${prefix}${tone}-${key}-rgb) / <alpha-value>)`];
        })
      ),
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
        // The background counterpart to `foreground` and `outline`. DEFAULT is
        // pure white so a card still reads as raised on a tinted page.
        surface: {
          DEFAULT: "rgb(var(--surface-default-rgb) / <alpha-value>)",
          subtle: "rgb(var(--surface-subtle-rgb) / <alpha-value>)",
          muted: "rgb(var(--surface-muted-rgb) / <alpha-value>)",
          strong: "rgb(var(--surface-strong-rgb) / <alpha-value>)",
          inverse: "rgb(var(--surface-inverse-rgb) / <alpha-value>)",
        },
        // Scrim only. `/opacity` composes, so a lighter backdrop is
        // bg-overlay/40 rather than another token.
        overlay: "rgb(var(--overlay-rgb) / <alpha-value>)",
        // Declared with an <alpha-value> slot, NOT a bare var(): Tailwind can
        // only generate a /opacity modifier for the former. As bare vars,
        // bg-success/10, bg-warning/10, text-brandInk/70 and friends emitted no
        // CSS at all — 31 dead utilities across the app, invisible to
        // tsc/lint/build. `ink-*` is deliberately NOT converted: those tokens
        // are already alpha (--ink-50 is 50% black), so a modifier would
        // compound into a silent double-dim rather than fail loudly.
        // Semantic tones, generated from the token source rather than listed by
        // hand — a role added in tokens.cjs (as `surfaceStrong` was) reaches
        // Tailwind automatically instead of silently existing only as a CSS var.
        ...toneScale(tokens.color.status),
        // Categorical hues, namespaced so `hue-teal-surface` can never be
        // mistaken for — or collide with — the Tailwind palette's `teal`.
        hue: toneScale(tokens.color.hue, "hue-"),
        // `text-black` (39 uses) and `bg-black` (30) historically meant a SOFT
        // black — the old ink-90, #000000E5 — not pure black. Now that the ink
        // ramp is gone it aliases the neutral role that replaced it, so those
        // call sites keep rendering the same colour. New UI should use
        // foreground-primary / surface-inverse explicitly.
        black: tokens.color.foreground.primary,
      },
      backgroundImage: {
        'section-yellow': 'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), linear-gradient(90deg, rgb(242, 222, 77) 0%, rgb(242, 222, 77) 100%)',
        'section-cyan': 'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), linear-gradient(90deg, rgb(0, 218, 230) 0%, rgb(0, 218, 230) 100%)',
        'section-purple': 'linear-gradient(90deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.7) 100%), linear-gradient(90deg, rgb(241, 147, 255) 0%, rgb(241, 147, 255) 100%)',
        'footer-hero': 'linear-gradient(90deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.2) 100%), linear-gradient(rgba(254, 44, 85, 0) 31.929%, rgba(254, 44, 85, 0.85) 85.643%)',
      },
      borderRadius: {
        // outer = inner + 8px inset, at every level: panel → card → media.
        // See the `radius` block in tokens.cjs for the rule.
        media: "var(--radius-media)",
        field: "var(--radius-field)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      spacing: {
        // The iOS home indicator. Any bar that touches the bottom edge — the
        // seller BottomNav, the marketplace VendorNav — has to clear it, and
        // `pb-safe` was already being written as though this existed. It did
        // not: the class was in the markup, matched no utility, and emitted
        // nothing, so the nav sat under the indicator on every notched phone.
        safe: "env(safe-area-inset-bottom)",
        // The height of a form row — an InputField, or a row you tap to edit
        // one. 52px is off the 4px scale (13 × 4), which is why it has always
        // been written as the arbitrary `h-[52px]` and why rows that were meant
        // to match it drifted to 60 and 64.
        //
        // NEW code uses this. The existing `h-[52px]` call sites — InputField
        // included — are deliberately NOT migrated here: a token is invisible
        // to Tailwind until the config is re-read, so switching a primitive
        // used on ~93 call sites to a brand-new token is a change that cannot
        // be verified by tsc, lint or tests, only by looking. Migrate them in
        // their own pass, with a restart and a render.
        field: "52px",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        modal: "var(--z-modal)",
        toast: "var(--z-toast)",
      },
      transitionProperty: {
        // Collapsing headers animate their own box, not their contents. Tailwind
        // ships no utility for that (`transition` covers colour/opacity/transform
        // only, and `transition-all` animates everything including layout it has
        // no business touching), so the two call sites were reaching for
        // `transition-[padding]` / `transition-[margin]` arbitrary values.
        spacing: "margin, padding",
      },
      letterSpacing: {
        // Add only what Tailwind does not already provide. Declaring the full
        // scale at `theme.letterSpacing` replaced Tailwind's defaults.
        tightest: "-.075em",
      },
    },
  },
};

// DELIBERATELY NOT PROVIDED: a `fade-edge-*` mask utility.
//
// Masking a scrolling rail's trailing edge is the obvious way to say "there is
// more" — and it silently breaks every `backdrop-filter` inside it. An element
// with a mask becomes a backdrop root, so a descendant can only sample what is
// painted within that element: the frosted product tiles in VendorCard sampled
// nothing and rendered as flat transparent panes. It was invisible until you
// scrolled to the end, because that is when the class came off.
//
// Verified, not assumed: two identical rails over the same striped backdrop,
// one masked and one not — the masked tiles showed sharp stripes, the unmasked
// ones blurred. Fade a rail with a positioned sibling gradient instead.
