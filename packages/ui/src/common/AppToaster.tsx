"use client";

import { Toaster } from "sonner";

/**
 * AppToaster — the app's toast surface.
 *
 * Toasts were the one piece of chrome the design system never covered: both
 * apps mounted sonner bare (`<Toaster position="top-right"/>`), so every toast
 * rendered at the library's own 8px radius, its own font stack and its own
 * greys, beside cards at `rounded-card` (16px) in Outfit. On a brand surface
 * the mismatch is obvious — a toast is the most interruptive thing on screen
 * and it was the only thing not speaking the system's language.
 *
 * Everything here is a token, so a toast matches the cards it appears over:
 * `rounded-card`, `shadow-pop` (it floats above everything), `border-outline`,
 * `bg-surface`, and the type scale. Sonner's own CSS variables are set too,
 * because it styles the close button and the loader from those rather than from
 * `classNames`.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      // Errors and successes should be distinguishable without reading, but
      // sonner's `richColors` ships its own palette — the tone classes below
      // are the app's, so it stays off.
      toastOptions={{
        classNames: {
          toast:
            "rounded-card border border-outline bg-surface text-foreground-primary shadow-pop font-sans text-body gap-3",
          title: "text-body font-medium text-foreground-primary",
          description: "text-body-sm text-foreground-secondary",
          actionButton:
            "rounded-pill bg-brand text-brandInk text-body-sm font-medium min-h-9 px-4",
          cancelButton:
            "rounded-pill bg-surface-subtle text-foreground-secondary text-body-sm font-medium min-h-9 px-4",
          closeButton: "rounded-full border-outline bg-surface text-foreground-secondary",
          success: "[&_[data-icon]]:text-success-foreground",
          error: "[&_[data-icon]]:text-error-foreground",
          warning: "[&_[data-icon]]:text-warning-foreground",
          info: "[&_[data-icon]]:text-info-foreground",
        },
        style: {
          // Sonner reads these for the parts `classNames` cannot reach.
          borderRadius: "var(--radius-card)",
          background: "rgb(var(--surface-default-rgb))",
          color: "rgb(var(--foreground-primary-rgb))",
          border: "1px solid rgb(var(--outline-default-rgb))",
        },
      }}
    />
  );
}
