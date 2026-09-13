const assert = require("node:assert/strict");
const tailwindColors = require("tailwindcss/colors");
const {
  tokens,
  cssVariables,
  brandRoleSteps,
  brandNeutralRoleSteps,
  semanticColorSteps,
  categoricalColorSteps,
  toneRoleSteps,
  neutralRoleSteps,
} = require("../tokens.cjs");

const channels = tokens.color.brand.DEFAULT
  .replace("#", "")
  .match(/.{2}/g)
  .map((pair) => Number.parseInt(pair, 16))
  .join(" ");

assert.equal(
  cssVariables["--brand-500-rgb"],
  channels,
  "brand-500 must be the canonical brand colour"
);

// Every neutral role aliases a step on Tailwind's neutral scale, with ONE
// deliberate exception: `surface.DEFAULT` is pure white, which is not a step on
// that scale. A card has to read as raised on a neutral-50 page, and collapsing
// that distinction would flatten every settings screen. The exception is
// asserted explicitly rather than skipped, so it cannot silently become
// something else.
assert.equal(
  tokens.color.surface.DEFAULT,
  "#FFFFFF",
  "surface (DEFAULT) must be pure white, not a neutral step — see comment above"
);

for (const [family, roles] of Object.entries(neutralRoleSteps)) {
  for (const [role, step] of Object.entries(roles)) {
    if (step === "white") continue; // asserted above
    assert.equal(
      tokens.color[family][role],
      tailwindColors.neutral[step],
      `${family}-${role.toLowerCase()} must alias Tailwind neutral-${step}`
    );
  }
}
assert.equal(
  cssVariables["--brand-rgb"],
  cssVariables["--brand-500-rgb"],
  "the unnumbered brand alias and brand-500 must never diverge"
);

for (const [role, step] of Object.entries(brandRoleSteps)) {
  assert.equal(
    cssVariables[`--brand-${role}-rgb`],
    cssVariables[`--brand-${step}-rgb`],
    `brand ${role} must alias brand-${step}`
  );
}

for (const [step, value] of Object.entries(tailwindColors.neutral)) {
  assert.equal(
    tokens.color.neutral[step],
    value,
    `neutral-${step} must alias Tailwind neutral-${step}`
  );
  assert.equal(
    cssVariables[`--neutral-${step}-rgb`],
    value
      .replace("#", "")
      .match(/.{2}/g)
      .map((pair) => Number.parseInt(pair, 16))
      .join(" "),
    `neutral-${step} CSS channels must match Tailwind neutral-${step}`
  );
}

assert.equal(
  cssVariables["--brand-ink-rgb"],
  cssVariables[`--neutral-${brandNeutralRoleSteps.ink}-rgb`],
  `brand ink must alias neutral-${brandNeutralRoleSteps.ink}`
);

for (const [family, steps, group] of [
  ["status", semanticColorSteps, tokens.color.status],
  ["hue", categoricalColorSteps, tokens.color.hue],
]) {
  for (const [role, { family: palette, ...roles }] of Object.entries(steps)) {
    for (const [roleName, step] of Object.entries(roles)) {
      assert.equal(
        group[role][roleName],
        tailwindColors[palette][step],
        `${family}.${role}.${roleName} must alias Tailwind ${palette}-${step}`
      );
    }
  }
}

/**
 * The contrast contract — the reason `foreground` is the 700 step.
 *
 * A tone's foreground ships as small text in three places: on plain white, on
 * its own `surface` (a badge) and on its own `surfaceStrong` (a filled icon
 * circle). All three must clear the WCAG AA 4.5:1 small-text bar. At the
 * previous 600 step they did not — success measured 3.15:1 on its own surface
 * and 3.30:1 on white, warning 3.07/3.19 — so three of the four semantic tones
 * were failing wherever a status pill rendered.
 *
 * Asserted rather than commented: a future shade change that reintroduces the
 * failure breaks the build instead of shipping quietly.
 */
const relativeLuminance = (hex) =>
  [0, 2, 4]
    .map((offset) => Number.parseInt(hex.replace("#", "").slice(offset, offset + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
    )
    .reduce((total, channel, index) => total + [0.2126, 0.7152, 0.0722][index] * channel, 0);

const contrastRatio = (a, b) => {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

const AA_SMALL_TEXT = 4.5;
let worstContrast = { ratio: Infinity };
for (const group of [tokens.color.status, tokens.color.hue]) {
  for (const [tone, roles] of Object.entries(group)) {
    for (const [context, background] of [
      ["white", "#FFFFFF"],
      ["surface", roles.surface],
      ["surfaceStrong", roles.surfaceStrong],
    ]) {
      const ratio = contrastRatio(roles.foreground, background);
      if (ratio < worstContrast.ratio) worstContrast = { ratio, tone, context };
      assert.ok(
        ratio >= AA_SMALL_TEXT,
        `${tone}.foreground on ${context} is ${ratio.toFixed(2)}:1, below the ${AA_SMALL_TEXT}:1 ` +
          `WCAG AA small-text bar. Darken the tone's foreground step in tokens.cjs.`
      );
    }
  }
}

console.log(
  `Brand contract valid: brand = brand-500 = ${tokens.color.brand.DEFAULT}; ` +
    `hover → brand-600, deep → brand-900, ink → neutral-950`
);
console.log("Brand neutral contract valid: neutral-50…950 exactly aliases Tailwind neutral");
console.log("Neutral semantic contract valid: foreground and outline roles alias Tailwind neutral");
// `tokens.screens` exists so a media query written in JavaScript and a `md:`
// written in CSS cannot name two different numbers. It restates Tailwind's
// defaults rather than overriding them, so the thing that can rot is Tailwind
// changing underneath it — assert against the RESOLVED config, not the literal.
{
  const resolveConfig = require("tailwindcss/resolveConfig");
  const preset = require("../preset.cjs");
  const resolved = resolveConfig({ content: [], presets: [preset] });

  for (const [name, value] of Object.entries(tokens.screens)) {
    assert.equal(
      resolved.theme.screens[name],
      value,
      `tokens.screens.${name} (${value}) must equal Tailwind's resolved ${name} ` +
        `(${resolved.theme.screens[name]}) — JS reads these to decide whether to ` +
        `mount expensive subtrees, and CSS reads the same number for layout`
    );
  }

  // The size-container utility backs the auth media pane's container queries.
  // It lives in the preset precisely so @vibaar/ui does not depend on an app
  // stylesheet; if it were dropped the artwork would silently stop scaling.
  const utilities = preset.plugins.flatMap((p) => {
    const found = [];
    p.handler({ addUtilities: (u) => found.push(...Object.keys(u)) });
    return found;
  });
  assert.ok(
    utilities.includes(".container-size"),
    "the preset must provide .container-size — @vibaar/ui relies on it and must " +
      "not fall back to an application stylesheet"
  );
}

const roleSummary = Object.entries(toneRoleSteps)
  .map(([role, step]) => `${role} → ${step}`)
  .join(", ");
console.log(`Tone contract valid: ${roleSummary}`);
console.log(
  `  ${Object.keys(semanticColorSteps).length} semantic tones + ` +
    `${Object.keys(categoricalColorSteps).length} categorical hues alias Tailwind exactly`
);
console.log(
  `  every foreground clears WCAG AA 4.5:1 on white / surface / surfaceStrong ` +
    `(worst: ${worstContrast.tone} on ${worstContrast.context}, ${worstContrast.ratio.toFixed(2)}:1)`
);
