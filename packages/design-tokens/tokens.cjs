/**
 * Canonical Vibaar design-token values.
 *
 * This file owns values; consumers own mappings. `preset.cjs` maps them into
 * Tailwind and `tokens.css` is generated from them for runtime CSS/SVG use.
 * Keeping both outputs behind this module prevents the former split-brain
 * contract where Tailwind lived here but its CSS variables lived in web.
 */

const { buildScale } = require("./scripts/generate-brand-scale.cjs");

/**
 * Brand colour SCALE, derived from the brand hex in OKLCH — see
 * scripts/generate-brand-scale.cjs for the method and why it anchors at 300.
 * Computed rather than pasted so a rebrand stays a single hex change.
 */
const brandScale = (hex) =>
  Object.fromEntries(buildScale(hex).map(({ step, rgb }) => [step, rgb.join(" ")]));

const color = {
  brand: {
    DEFAULT: "#FFE500",
    hover: "#E6CE00",
    ink: "#14130E",
    deep: "#7A5E00",
  },
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
    success: "#06C270",
    successStrong: "#047857",
    error: "#CC2020",
    warning: "#F59E0B",
    warningStrong: "#B45309",
    info: "#0063F7",
  },
  landing: {
    yellow: "#F2DE4D",
    cyan: "#00DAE6",
    purple: "#F193FF",
    darkFooter: "#010A0B",
    navy: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
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

const cssVariables = {
  "--brand-rgb": rgbChannels(color.brand.DEFAULT),
  "--brand": "rgb(var(--brand-rgb))",
  "--brand-hover": color.brand.hover,
  "--brand-hover-rgb": rgbChannels(color.brand.hover),
  "--brand-ink": color.brand.ink,
  "--brand-ink-rgb": rgbChannels(color.brand.ink),
  "--brand-deep": color.brand.deep,
  "--brand-deep-rgb": rgbChannels(color.brand.deep),
  ...Object.fromEntries(
    Object.entries(brandScale(color.brand.DEFAULT)).map(([step, channels]) => [
      `--brand-${step}-rgb`,
      channels,
    ])
  ),
  ...Object.fromEntries(Object.entries(color.ink).map(([step, value]) => [`--ink-${step}`, value])),
  "--line": color.line,
  "--success": color.status.success,
  "--success-rgb": rgbChannels(color.status.success),
  "--success-strong": color.status.successStrong,
  "--success-strong-rgb": rgbChannels(color.status.successStrong),
  "--error": color.status.error,
  "--error-rgb": rgbChannels(color.status.error),
  "--warning": color.status.warning,
  "--warning-rgb": rgbChannels(color.status.warning),
  "--warning-strong": color.status.warningStrong,
  "--warning-strong-rgb": rgbChannels(color.status.warningStrong),
  "--info": color.status.info,
  "--info-rgb": rgbChannels(color.status.info),
  ...Object.fromEntries(Object.entries(tokens.radius).map(([name, value]) => [`--radius-${name}`, value])),
  ...Object.fromEntries(Object.entries(tokens.shadow).map(([name, value]) => [`--shadow-${name}`, value])),
  ...Object.fromEntries(Object.entries(tokens.zIndex).map(([name, value]) => [`--z-${name}`, value])),
};

function leafNames(node, prefix) {
  return Object.entries(node).flatMap(([name, value]) => {
    const path = `${prefix}-${name}`;
    return typeof value === "string" ? [path] : leafNames(value, path);
  });
}

/** Literal project colours that are available but are not semantic tokens. */
const projectLiteralColorNames = ["black", "green", "red", ...leafNames(color.landing, "landing")];

module.exports = { tokens, cssVariables, projectLiteralColorNames };
