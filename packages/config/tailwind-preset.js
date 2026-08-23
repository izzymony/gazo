/**
 * @vibaar/config — shared Tailwind preset (SEED, not yet adopted).
 *
 * Only the brand token is genuinely shared today: web expresses it as
 * `--brand-rgb` channels (for /opacity), admin used a `#FE2C55` literal.
 * The full token reconciliation — web's ink-ramp / opacity-channel system vs
 * admin's shadcn-HSL palette — is tracked M1 follow-up (see README). Apps keep
 * their own tailwind.config for now; adopt this preset incrementally.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FE2C55",
        },
      },
    },
  },
};
