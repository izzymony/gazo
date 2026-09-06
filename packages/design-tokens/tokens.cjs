/**
 * Canonical Vibaar design-token values.
 *
 * This file owns values; consumers own mappings. `preset.cjs` maps them into
 * Tailwind and `tokens.css` is generated from them for runtime CSS/SVG use.
 * Keeping both outputs behind this module prevents the former split-brain
 * contract where Tailwind lived here but its CSS variables lived in web.
 */

const { buildScale } = require("./scripts/generate-brand-scale.cjs");
const tailwindColors = require("tailwindcss/colors");

/**
 * Brand colour scale derived from the canonical brand hex — see the generator
 * for the method. The canonical brand is 500, matching Tailwind's numeric API.
 * Computed rather than pasted so a rebrand stays a single hex change.
 */
const CANONICAL_BRAND = "#FFE500";
const brandScale = Object.fromEntries(
  buildScale(CANONICAL_BRAND).map(({ step, rgb }) => [step, rgb.join(" ")])
);
const brandRoleSteps = {
  hover: 600,
  deep: 900,
};
const brandNeutralRoleSteps = {
  ink: 950,
};
/**
 * The four roles every tone carries. One shape for semantic tones and
 * categorical hues alike, so a tinted label can be built the same way whatever
 * it means: `surface` behind it, `border` around it, `foreground` for the text,
 * `surfaceStrong` when the same tone has to read as a filled icon circle.
 *
 * `foreground` is the 700 step, NOT 600. At 600 the text failed WCAG AA in
 * every context it actually shipped in — green-600 on green-50 measured 3.15:1
 * and on plain white 3.30:1, against the 4.5:1 small-text bar; amber was worse
 * at 3.07/3.19. Three of the four semantic tones were failing. At 700 all ten
 * tones clear 4.5:1 on white, on `surface` AND on `surfaceStrong`, which is why
 * one foreground role covers all three contexts instead of needing a separate
 * on-tint colour. Verified numerically, not by eye — re-check with the same
 * three ratios before changing any step here.
 */
const toneRoleSteps = { foreground: 700, surface: 50, surfaceStrong: 100, border: 200 };

/**
 * Semantic tones — these MEAN something (an error is red because it failed).
 */
const semanticColorSteps = {
  success: { family: "green", ...toneRoleSteps },
  error: { family: "red", ...toneRoleSteps },
  warning: { family: "amber", ...toneRoleSteps },
  info: { family: "blue", ...toneRoleSteps },
};

/**
 * Categorical hues — these DISTINGUISH rather than mean. The order timeline
 * needs ~8 mutually distinguishable stage colours (placed → paid → preparing →
 * transit → delivering → delivered), which the four semantic tones cannot
 * supply without pretending that "in transit" is a warning.
 *
 * They exist as tokens so that need stops being met with raw palette classes:
 * `bg-teal-50 text-teal-700 border-teal-600` was hardcoded per hue in the app,
 * which is exactly how the badge family fragmented in the first place.
 */
const categoricalColorSteps = {
  teal: { family: "teal", ...toneRoleSteps },
  orange: { family: "orange", ...toneRoleSteps },
  purple: { family: "purple", ...toneRoleSteps },
  sky: { family: "sky", ...toneRoleSteps },
  indigo: { family: "indigo", ...toneRoleSteps },
  emerald: { family: "emerald", ...toneRoleSteps },
};
const neutralRoleSteps = {
  foreground: {
    primary: 900,
    secondary: 700,
    muted: 500,
    disabled: 400,
    inverse: 50,
  },
  outline: {
    subtle: 100,
    DEFAULT: 200,
    strong: 300,
    emphasis: 400,
    contrast: 900,
  },
  /**
   * Backgrounds. The missing third of the trio — `foreground` and `outline`
   * existed, so text and borders had a role to reach for while backgrounds had
   * nothing: the app improvised with bg-white (98), bg-ink-3 (74), bg-ink-5
   * (31) and raw bg-[#hex] (15). `surface` is the page/card ground; the tints
   * step up from it. Note DEFAULT is pure white, not neutral-50 — a card on a
   * neutral-50 page still has to read as raised.
   */
  surface: {
    DEFAULT: "white",
    subtle: 50,
    muted: 100,
    strong: 200,
    inverse: 900,
  },
};

/** `surfaceStrong` -> `surface-strong`. CSS variables and Tailwind keys across
 *  this file are kebab-case; only the JS object keys are camel. */
const kebab = (name) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

/** Resolve one tone's role to its hex, from either tone map. */
const toneColor = (role, roleName) => {
  const { family, ...steps } = semanticColorSteps[role] ?? categoricalColorSteps[role];
  return tailwindColors[family][steps[roleName]];
};

/** Expand a tone-steps map into `{ tone: { foreground, surface, ... } }`. */
const buildTones = (stepsMap) =>
  Object.fromEntries(
    Object.keys(stepsMap).map((role) => [
      role,
      Object.fromEntries(
        Object.keys(toneRoleSteps).map((roleName) => [roleName, toneColor(role, roleName)])
      ),
    ])
  );

const channelsToHex = (channels) =>
  `#${channels
    .split(" ")
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();

const color = {
  brand: {
    DEFAULT: CANONICAL_BRAND,
    hover: channelsToHex(brandScale[brandRoleSteps.hover]),
    ink: tailwindColors.neutral[brandNeutralRoleSteps.ink],
    deep: channelsToHex(brandScale[brandRoleSteps.deep]),
  },
  neutral: tailwindColors.neutral,
  foreground: Object.fromEntries(
    Object.entries(neutralRoleSteps.foreground).map(([role, step]) => [
      role,
      tailwindColors.neutral[step],
    ])
  ),
  outline: Object.fromEntries(
    Object.entries(neutralRoleSteps.outline).map(([role, step]) => [
      role,
      tailwindColors.neutral[step],
    ])
  ),
  surface: Object.fromEntries(
    Object.entries(neutralRoleSteps.surface).map(([role, step]) => [
      role,
      step === "white" ? "#FFFFFF" : tailwindColors.neutral[step],
    ])
  ),
  /**
   * Scrim over arbitrary content — the modal backdrop, and anything else that
   * must darken whatever is behind it. This replaces an 11-step `ink` ramp of
   * transparent blacks that was being used as a neutral palette: of 886 uses
   * across the app, exactly ONE was a genuine overlay. Text, borders and
   * backgrounds now use foreground/outline/surface, which are solid and do not
   * tint the surface they sit on.
   *
   * Declared in channels so `/opacity` composes — a lighter scrim is
   * `bg-overlay/40`, not another token.
   */
  overlay: "#000000",
  status: buildTones(semanticColorSteps),
  hue: buildTones(categoricalColorSteps),
};

const tokens = {
  color,
  radius: {
    field: "12px",
    card: "16px",
    pill: "9999px",
  },
  shadow: {
    card: "0 1px 3px rgba(0, 0, 0, 0.08)",
    pop: "0 4px 24px rgba(0, 0, 0, 0.12)",
  },
  zIndex: {
    dropdown: "30",
    sticky: "40",
    modal: "50",
    toast: "60",
  },
};

function rgbChannels(hex) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Expected a six-digit hex colour, received ${hex}`);
  }
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)).join(" ");
}

const neutralScale = Object.fromEntries(
  Object.entries(tailwindColors.neutral).map(([step, value]) => [step, rgbChannels(value)])
);

const cssVariables = {
  "--brand-rgb": rgbChannels(color.brand.DEFAULT),
  "--brand": "rgb(var(--brand-rgb))",
  "--brand-hover": `rgb(var(--brand-${brandRoleSteps.hover}-rgb))`,
  "--brand-hover-rgb": brandScale[brandRoleSteps.hover],
  "--brand-ink": `rgb(var(--neutral-${brandNeutralRoleSteps.ink}-rgb))`,
  "--brand-ink-rgb": neutralScale[brandNeutralRoleSteps.ink],
  "--brand-deep": `rgb(var(--brand-${brandRoleSteps.deep}-rgb))`,
  "--brand-deep-rgb": brandScale[brandRoleSteps.deep],
  ...Object.fromEntries(
    Object.entries(brandScale).map(([step, channels]) => [
      `--brand-${step}-rgb`,
      channels,
    ])
  ),
  ...Object.fromEntries(
    Object.entries(neutralScale).map(([step, channels]) => [
      `--neutral-${step}-rgb`,
      channels,
    ])
  ),
  ...Object.fromEntries(
    Object.entries(neutralRoleSteps).flatMap(([family, roles]) =>
      Object.entries(roles).map(([role, step]) => [
        `--${family}-${role === "DEFAULT" ? "default" : role}-rgb`,
        // `surface.DEFAULT` is pure white, which is not a step on the neutral
        // scale — a card on a neutral-50 page still has to read as raised.
        step === "white" ? "255 255 255" : neutralScale[step],
      ])
    )
  ),
  "--overlay-rgb": rgbChannels(color.overlay),
  ...Object.fromEntries(
    Object.entries(color.status).flatMap(([role, roles]) =>
      Object.entries(roles).map(([roleName, value]) => [
        `--${role}-${kebab(roleName)}-rgb`,
        rgbChannels(value),
      ])
    )
  ),
  // Categorical hues are namespaced `--hue-*` so a token can never be confused
  // with the Tailwind palette colour of the same name (`hue-teal` vs `teal`).
  ...Object.fromEntries(
    Object.entries(color.hue).flatMap(([role, roles]) =>
      Object.entries(roles).map(([roleName, value]) => [
        `--hue-${role}-${kebab(roleName)}-rgb`,
        rgbChannels(value),
      ])
    )
  ),
  ...Object.fromEntries(Object.entries(tokens.radius).map(([name, value]) => [`--radius-${name}`, value])),
  ...Object.fromEntries(Object.entries(tokens.shadow).map(([name, value]) => [`--shadow-${name}`, value])),
  ...Object.fromEntries(Object.entries(tokens.zIndex).map(([name, value]) => [`--z-${name}`, value])),
};

/** Literal project colours that are available but are not semantic tokens. */
const projectLiteralColorNames = ["black"];

module.exports = {
  tokens,
  cssVariables,
  brandRoleSteps,
  brandNeutralRoleSteps,
  semanticColorSteps,
  categoricalColorSteps,
  toneRoleSteps,
  neutralRoleSteps,
  projectLiteralColorNames,
};
