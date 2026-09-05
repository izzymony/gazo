const assert = require("node:assert/strict");
const tailwindColors = require("tailwindcss/colors");
const {
  tokens,
  cssVariables,
  brandRoleSteps,
  brandNeutralRoleSteps,
  semanticColorSteps,
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

for (const [family, roles] of Object.entries(neutralRoleSteps)) {
  for (const [role, step] of Object.entries(roles)) {
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

for (const [role, { family, ...tones }] of Object.entries(semanticColorSteps)) {
  for (const [tone, step] of Object.entries(tones)) {
    assert.equal(
      tokens.color.status[role][tone],
      tailwindColors[family][step],
      `${role}-${tone} must alias Tailwind ${family}-${step}`
    );
  }
}

console.log(
  `Brand contract valid: brand = brand-500 = ${tokens.color.brand.DEFAULT}; ` +
    `hover → brand-600, deep → brand-900, ink → neutral-950`
);
console.log("Brand neutral contract valid: neutral-50…950 exactly aliases Tailwind neutral");
console.log("Neutral semantic contract valid: foreground and outline roles alias Tailwind neutral");
console.log("Semantic contract valid: foreground → 600, surface → 50, border → 200");
