/* eslint-disable @typescript-eslint/no-require-imports */
const { tokens } = require("./tokens.cjs");
const plugin = require("tailwindcss/plugin");

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
  plugins: [
    // Size containment, so a component can scale against the box it was GIVEN
    // rather than against the viewport. Tailwind 3.4 ships no `container-type`
    // utility and the official container-queries plugin is not installed, so
    // the two alternatives were an arbitrary property at every call site or a
    // class in the app's globals.css. The second is what `rail-safe-foreground`
    // does, and it is wrong for anything in @vibaar/ui: a package component
    // would silently depend on an application stylesheet, and break in the
    // design-system playground or any other consumer that does not load it.
    //
    // Declared here instead, beside the tokens, so every consumer of the preset
    // has it — and it is a real utility, so it raises no drift.
    //
    // `size`, not `inline-size`: the auth media pane must scale by height too,
    // or a short desktop window crops the artwork instead of shrinking it.
    // Note the containment contract — a size container cannot be sized BY its
    // contents, so the element needs its dimensions from its own layout.
    plugin(({ addUtilities }) => {
      addUtilities({
        ".container-size": { "container-type": "size" },
        ".container-inline": { "container-type": "inline-size" },

        // A composition canvas: artwork whose parts must hold their relative
        // geometry while the whole scales to the box it is given.
        //
        // The auth slideshow was the case that needed it. Its floating cards
        // were positioned with absolute pixel offsets (±165) and sized in
        // absolute pixels (217–249), inside a pane whose width is whatever the
        // grid leaves it — 344px at 768, 928px at 1440. The composition spread
        // 579px regardless, so it overflowed its own pane by 117px a side at
        // 768 and left it half empty at 1440. A second hard-coded offset set
        // and a `window.innerWidth` branch existed to paper over the first half
        // of that; nothing covered the second.
        //
        // So: one canonical square coordinate system, scaled by its container.
        // Children declare their geometry as FRACTIONS of the canvas
        // (`--item-x`, `--item-y`, `--item-w`) and CSS multiplies them up, so
        // the whole composition scales continuously with no breakpoints, no
        // resize listener and no JS reading the viewport.
        //
        // Both axes: `72cqw` keeps the spread inside the pane's width,
        // `160cqh` keeps it inside a SHORT pane's height — without the second
        // term a 640px-tall window crops the artwork instead of shrinking it.
        // The ceiling stops raster cards being upscaled into mush.
        ".composition-canvas": {
          "--composition-scale": "clamp(11rem, min(72cqw, 160cqh), 39rem)",
          width: "var(--composition-scale)",
          "aspect-ratio": "1 / 1",
        },
        ".composition-item": {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "calc(var(--item-w, 0.5) * var(--composition-scale))",
          height: "auto",
        },
      });
    }),
  ],
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
      scale: {
        // The slideshow's floating cards, below `md`. Their artwork is sized
        // for the 450px desktop cluster; the retired mobile fork carried its
        // own copies at exactly two thirds (145/217, 155/232, 166/249,
        // 152/228 — 0.667 every time), and unifying the two trees handed
        // mobile the desktop sizes, which overhang a 390px screen by ~39px a
        // side. Scaled rather than repositioned so each card keeps the centre
        // `spread()` gives it, and the cards keep their differing widths.
        "slide-card": "0.667",
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
        // The hero band above the content column on /signin, /signup and
        // /welcome, below `md` (at `md` the artwork becomes a full-height pane
        // and this stops applying).
        //
        // Half the screen where there is room for it, yielding to the content
        // where there is not. The three terms, outermost last:
        //   50dvh          - the intent: the artwork takes half the screen
        //   100dvh - 25rem - reserve 400px for the headline, the actions and
        //                    the legal line, so a short phone shrinks the
        //                    artwork rather than pushing the buttons off
        //   max(14rem, ..) - but never collapse below 224px, or the artwork
        //                    stops reading as artwork
        // So it holds at 50% from ~812px tall upward and tapers below: 466px
        // at 932, 422 at 844, 267 at 667.
        //
        // `dvh`, not `vh`: the frame is `min-h-dvh`, and on mobile Safari `vh`
        // is the URL-bar-hidden viewport, which is not the space being divided.
        //
        // It is a token because all three screens must agree. They were written
        // as `h-[38vh] sm:h-[42vh]` on welcome and `h-60 sm:h-[500px]` on the
        // two auth screens, which is how the same band ended up 240px on one
        // and 321px on another at the same width. It is height-driven, so it
        // needs no `sm:` step — that was varying the wrong axis.
        "auth-band": "min(50dvh, max(14rem, 100dvh - 25rem))",
        // The seller desktop rail (--rail-width). Used by the rail, by the
        // gutter the dashboard frame reserves for it, and — through
        // `shell-inset` below — by anything fixed that has to clear it.
        rail: "var(--rail-width)",
        // The buyer's collapsed desktop rail.
        "buyer-rail": "var(--buyer-rail-width)",
        // How far a viewport-fixed element must be inset to clear the shell it
        // sits in. Zero unless a layout says otherwise, so PageShell's action
        // bar is unchanged everywhere except inside a shell that sets it.
        "shell-inset": "var(--shell-inset, 0px)",
      },
      gridTemplateColumns: {
        // The desktop page-header band: a flexible title column and one `auto`
        // column per trailing cell. The action column sizing to its own content
        // is the whole point — an absolutely-positioned action would share the
        // header's coordinates but not its layout calculation, so a long title
        // would run underneath it. Here the title truncates against the space
        // that genuinely remains.
        //
        // `1fr`, NOT `minmax(0,1fr)`. This was the other way round and measured
        // wrong in Chrome: with `<main>` spanning `1 / -1`, a `minmax(0,1fr)`
        // track does not expand into the free space, and the default
        // `justify-content: stretch` then splits that space across the tracks
        // instead — the "auto" action column came out 417px wide inside a
        // 984px band, with the button floating at its left edge. Measured, not
        // reasoned: `1fr auto` gives 909.78 / 62.22 on the same page.
        //
        // The objection to `1fr` is that its automatic minimum is min-content,
        // which would let a long title push the action off the row. That does
        // not apply because `HeaderRow` sets `min-w-0`, so the item contributes
        // a zero minimum to the track and `truncate` still engages. Verified at
        // 1280 with a 96-character title: the action held at 62px on the right
        // edge and the title clipped. Keep `min-w-0` on any item placed in this
        // column — it is load-bearing here, not defensive.
        "page-band": "1fr auto",
        "page-band-status": "1fr auto auto",
        // Content beside a bounded summary panel. 360px holds a money column —
        // a label and a right-aligned figure — without the figures wrapping, and
        // leaves the review list the majority of a 1024px column.
        //
        // `1fr`, not `minmax(0,1fr)`, for the reason recorded above; the content
        // column carries `min-w-0` so the zero minimum comes from the item.
        "content-aside": "1fr 360px",
        // The product page: gallery and details left, purchase panel right. 380
        // rather than 360 because this panel holds variant swatches and a
        // delivery card, not a column of figures.
        product: "1fr 380px",
      },
      gridTemplateRows: {
        // title/action row · progress · content. Progress gets its OWN row so
        // row 1's height is the title/action row alone — as one opaque cell it
        // would measure title+progress, and the action would centre against the
        // combined height, drifting on the 9 stepper screens but not the rest.
        //
        // Row 3 is `1fr` for the same measured reason as the columns above: as
        // `minmax(0,1fr)` it refused to expand and the two `auto` rows absorbed
        // the free space instead — a 48px header row rendered 189px tall and an
        // EMPTY progress row rendered 141px tall. `1fr`'s min-content minimum is
        // harmless here because the only item in the row is a scroll container,
        // whose automatic minimum size is already zero.
        "page-band": "auto auto 1fr",
        // Content, then the action directly beneath it.
        //
        // `minmax(0, max-content)` is the whole trick and `1fr` is the trap.
        // With `1fr` the content row takes every pixel available, so on a short
        // page the action is pushed to the bottom of the viewport — a fixed bar
        // in all but the CSS. Here row 2 is sized to the action first and row 1
        // gets what is left UP TO its content height, so a short page puts the
        // action right under the last field and a long one scrolls the content
        // with the action still parked below it.
        "page-action": "minmax(0,max-content) auto",
      },
      maxWidth: {
        // Dialog panel widths, by role rather than by pixel count.
        //
        // `dialog` is the 448px `lg:max-w-md` the modal primitive has always
        // used, named so it stops being an incidental Tailwind step. `dialog-lg`
        // is 640px for a dialog that holds a FORM: three stacked fields, their
        // labels and their error text do not read at 448px, and a route-backed
        // dialog is a whole screen's content, not a confirmation.
        dialog: "448px",
        "dialog-lg": "640px",
      },
      maxHeight: {
        // A dialog may grow with its content and then stop one comfortable
        // gutter short of the viewport — NOT at a hard 600px, which capped a
        // 1440-tall screen and a 640-tall one identically. `dvh` so the mobile
        // URL bar collapsing does not leave the panel overhanging.
        dialog: "calc(100dvh - 64px)",
        // A sticky aside panel: as tall as the viewport leaves it, so its body
        // can scroll internally and the action it holds stays on screen instead
        // of being pushed below the fold by a long options list.
        aside: "calc(100dvh - 2rem)",
      },
      minWidth: {
        // The desktop inline page-action floor. A "Save" that hugs its label is
        // 78px and reads as incidental next to the content it commits; the
        // design rule is a 160–200px band, and 176 sits in the middle of it.
        //
        // A token rather than an arbitrary value because it is a decision, not
        // a measurement — and because `minWidth` carries NO spacing scale in
        // Tailwind (its defaults are only 0/full/min/max/fit), so `min-w-44`
        // silently generates nothing. That failure mode has already cost this
        // codebase every input on the page once.
        action: "176px",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        shell: "var(--z-shell)",
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
