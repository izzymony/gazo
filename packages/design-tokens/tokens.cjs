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
const semanticColorSteps = {
  success: { family: "green", foreground: 600, surface: 50, border: 200 },
  error: { family: "red", foreground: 600, surface: 50, border: 200 },
  warning: { family: "amber", foreground: 600, surface: 50, border: 200 },
  info: { family: "blue", foreground: 600, surface: 50, border: 200 },
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

const semanticColor = (role, tone) => {
  const { family, ...steps } = semanticColorSteps[role];
  return tailwindColors[family][steps[tone]];
};

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
  ink: {
    3: "#00000008",
    5: "#0000000D",
    10: "#0000001A",
    20: "#00000033",
    30: "#0000004D",
    40: "#00000066",
    50: "#00000080",
    60: "#00000099",
    70: "#000000B2",
    80: "#000000CC",
    90: "#000000E5",
  },
  line: "rgba(0, 0, 0, 0.06)",
  status: {
    success: {
      foreground: semanticColor("success", "foreground"),
      surface: semanticColor("success", "surface"),
      border: semanticColor("success", "border"),
    },
    error: {
      foreground: semanticColor("error", "foreground"),
      surface: semanticColor("error", "surface"),
      border: semanticColor("error", "border"),
    },
    warning: {
      foreground: semanticColor("warning", "foreground"),
      surface: semanticColor("warning", "surface"),
      border: semanticColor("warning", "border"),
    },
    info: {
      foreground: semanticColor("info", "foreground"),
      surface: semanticColor("info", "surface"),
      border: semanticColor("info", "border"),
    },
  },
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
  ...Object.fromEntries(Object.entries(color.ink).map(([step, value]) => [`--ink-${step}`, value])),
  "--line": color.line,
  ...Object.fromEntries(
    Object.entries(color.status).flatMap(([role, tones]) =>
      Object.entries(tones).map(([tone, value]) => [`--${role}-${tone}-rgb`, rgbChannels(value)])
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
  neutralRoleSteps,
  projectLiteralColorNames,
};
