import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge doesn't know the design system's custom fontSize tokens
// (tailwind.config fontSize: display/h1/h2/body-lg/body/body-sm/caption/micro).
// Without this it misclassifies e.g. `text-micro` as a text-color and DROPS it
// when merged next to a real text-<color> class — silently falling back to the
// inherited size. Register the scale as font-sizes so size + color coexist.
// (Carried over from web's src/lib/utils.ts — the canonical cn.)
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "body-lg",
            "body",
            "body-sm",
            "caption",
            "micro",
          ],
        },
      ],
    },
  },
});

/**
 * Merge Tailwind class names. `clsx` resolves conditionals/arrays; `tailwind-merge`
 * dedupes conflicting utilities so the last one wins
 * (e.g. cn("px-2", cond && "px-4") → "px-4").
 *
 * Canonical shared implementation. Apps still ship their own local `cn` today;
 * migrate call sites onto this incrementally (see README → M1 follow-up).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
