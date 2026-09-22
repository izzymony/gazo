import { cn } from "@vibaar/utils";

export interface SpinnerProps {
  /**
   * Diameter in px. A number rather than a t-shirt scale because a Spinner
   * usually stands in for an icon and has to match it exactly — the seller
   * bottom nav swaps a 22px icon for a spinner, and a 20px one shifts the row.
   */
  size?: number;
  /**
   * Stroke colour. Defaults to `currentColor`, so it inherits from whatever it
   * sits in — a nav item's active colour, a button's label colour. Pass a value
   * only when the surrounding text colour is not the colour you want.
   */
  color?: string;
  /**
   * Accessible name. Omitted by default: a spinner inside a control is
   * decorative, because the control itself carries `aria-busy` and the loading
   * label. Pass one only when this spinner IS the whole loading affordance.
   */
  label?: string;
  className?: string;
}

/**
 * Spinner — the bare loading indicator.
 *
 * This exact SVG existed in five places: privately inside `Button`, and copied
 * into SignIn, SignUp, BottomNav and DesktopNav — two of them carrying a
 * comment saying "matches Button component pattern", which is what copying
 * instead of importing looks like. They had already drifted into four
 * different structures: `aria-hidden` on some, `h-[22px]` on one, a `color`
 * prop on others.
 *
 * It is deliberately layout-free — no wrapper, no centring, no text. That is
 * `Loader`'s job, and the split is why this can be dropped inline into a
 * button label or a nav slot where Loader's `w-full` block would not fit.
 */
export default function Spinner({
  size = 20,
  color = "currentColor",
  label,
  className,
}: SpinnerProps) {
  return (
    <svg
      // Sized by attribute rather than a Tailwind class so an off-scale
      // diameter (the nav's 22px) needs no arbitrary utility.
      width={size}
      height={size}
      className={cn("animate-spin shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}>
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
