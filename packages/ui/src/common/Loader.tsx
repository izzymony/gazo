"use client";

import { cn } from "@vibaar/utils";

// Lightweight CSS spinner — replaces a 74 kB lottie-web + animation.json payload
// that was loading just to render a loading indicator. (Perf P3 — bundle.)

const SIZE = { sm: "h-5 w-5 border-2", md: "h-10 w-10 border-4", lg: "h-14 w-14 border-4" };

export type LoaderProps = {
  text?: string;
  /**
   * `page` fills the viewport and sits above everything (the original, and
   * still the default so all 26 existing call sites are unchanged).
   * `inline` renders in flow, for a section or a card that is still loading.
   */
  variant?: "page" | "inline";
  size?: keyof typeof SIZE;
  className?: string;
};

/**
 * The shared loading indicator.
 *
 * It used to be `page` only — hard-coded `h-screen ... z-toast` — so anything
 * needing an in-place spinner had to hand-roll one. That is why a second
 * implementation lives privately inside Button. `inline` exists so the next
 * one does not get hand-rolled too.
 */
export default function Loader({
  text,
  variant = "page",
  size = variant === "page" ? "md" : "sm",
  className,
}: LoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        variant === "page" ? "h-screen w-full px-6 z-toast" : "w-full py-6",
        className
      )}>
      <div
        role="status"
        aria-label="Loading"
        className={cn("rounded-full border-outline border-t-brand animate-spin", SIZE[size])}
      />
      {text && (
        <p className="text-center text-body-sm text-foreground-secondary max-w-[max-content]">
          {text}
        </p>
      )}
    </div>
  );
}
