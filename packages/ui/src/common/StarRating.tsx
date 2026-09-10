"use client";

import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

const DIMENSION = {
  xs: "w-3.5 h-3.5",
  sm: "w-6 h-6",
  lg: "w-10 h-10",
} as const;

const GAP = {
  xs: "gap-0.5",
  sm: "gap-1",
  lg: "gap-2",
} as const;

/**
 * StarRating — read-only display or interactive input.
 *
 * The app drew five stars in five different ways: two hand-rolled inline SVGs
 * in the buyer order list (24px and 40px, same path copied), a `FaStar` row in
 * the product page's review list, a 40-line masked inline SVG with three raw
 * hex fills in the seller's "Reviewed" tab, and another `FaStar` row in
 * VendorCard. This is the one, and it lives in the design system rather than
 * `features/orders` so `ReviewCard` can reach it.
 *
 * `xs` is the card size — a review's score sits beside its text, not above it.
 */
export default function StarRating({
  value,
  onRate,
  size = "sm",
  className,
}: {
  /** Stars filled, 0–5. */
  value: number;
  /** Omit for a read-only display. Receives the 1-based star index. */
  onRate?: (star: number) => void;
  size?: "xs" | "sm" | "lg";
  className?: string;
}) {
  const interactive = Boolean(onRate);

  const stars = [1, 2, 3, 4, 5].map((star) => {
    const filled = value >= star;
    const glyph = (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        // Brand yellow with a brandDeep outline — the same rule the empty-state
        // illustrations follow: a brand-yellow mark used illustratively gets an
        // outline so it holds an edge on a light surface.
        //
        // It used to be `--warning-foreground` (a dark amber) filled AND
        // stroked, which read as a muddy rust and, more to the point, was the
        // wrong token: a five-star rating is not a warning. Nothing about a
        // review should borrow the colour the app uses to say something is
        // wrong.
        fill={filled ? "var(--brand)" : "rgb(var(--surface-muted-rgb))"}
        stroke={filled ? "var(--brand-deep)" : "rgb(var(--outline-strong-rgb))"}
        strokeWidth={size === "lg" ? 1.5 : 2}
        className={DIMENSION[size]}>
        <path
          d="M12 2.75l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1L12 2.75z"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );

    if (!interactive) return <span key={star}>{glyph}</span>;

    // A rating control has to be operable by keyboard; the inline SVGs this
    // replaced carried onClick on the <svg> itself, which is neither focusable
    // nor announced.
    return (
      <button
        key={star}
        type="button"
        onClick={() => onRate?.(star)}
        aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
        aria-pressed={filled}
        className={cn("rounded-full", focusRing)}>
        {glyph}
      </button>
    );
  });

  return (
    <div className={cn("flex items-center", GAP[size], className)}>
      {stars}
      {/* The score itself, for anyone not reading the picture. A row of five
          shapes says nothing to a screen reader. */}
      {!interactive && (
        <span className="sr-only">{value} out of 5 stars</span>
      )}
    </div>
  );
}
