/**
 * Moved into the design system: `@vibaar/ui/common/StarRating`.
 *
 * It was already token-pure and keyboard-operable, but living under
 * `features/orders` put it out of reach of `packages/ui` — which is why
 * ReviewCard could not use it and the app grew five separate star renderings.
 * This re-export keeps the order screens' imports working.
 */
export { default } from "@vibaar/ui/common/StarRating";
