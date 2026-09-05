"use client";

import { cn } from "@/lib/utils";

/**
 * Star rating — read-only display or interactive input.
 *
 * The buyer order list drew this twice as a hand-rolled inline <svg> with a
 * duplicated star path, once at 24px for the "rate this item" row and once at
 * 40px in the review sheet. Same shape, two copies, and the only real
 * difference was the size and whether the click reported which star.
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
  size?: "sm" | "lg";
  className?: string;
}) {
  const interactive = Boolean(onRate);
  const dimension = size === "lg" ? "w-10 h-10" : "w-6 h-6";

  return (
    <div className={cn("flex items-center", size === "lg" ? "gap-2" : "gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star;
        const star_ = (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill={filled ? "var(--warning)" : "var(--ink-5)"}
            stroke={filled ? "var(--warning)" : "var(--ink-20)"}
            strokeWidth={size === "lg" ? 1.5 : 2}
            className={dimension}>
            <path
              d="M12 2.75l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25 1.18-6.88-5-4.87 6.91-1L12 2.75z"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        );

        if (!interactive) return <span key={star}>{star_}</span>;

        // A rating control has to be operable by keyboard; the previous inline
        // SVGs carried onClick on the <svg> itself, which is neither focusable
        // nor announced.
        return (
          <button
            key={star}
            type="button"
            onClick={() => onRate?.(star)}
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            aria-pressed={filled}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandDeep/40 focus-visible:ring-offset-1">
            {star_}
          </button>
        );
      })}
    </div>
  );
}
