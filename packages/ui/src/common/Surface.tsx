import React, { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

interface SurfaceProps {
  children: ReactNode;
  className?: string;
  /** When set the whole card becomes a real button — focusable and keyboard-operable. */
  onClick?: () => void;
  /** Accessible name for an interactive card whose content is not self-describing. */
  ariaLabel?: string;
}

/**
 * Surface — the canonical bordered container.
 *
 * Named `Card` until it became clear the name was actively misleading: this app
 * has at least seven things a person would call a card — the shop product card
 * (ccard/fluidcard), the storefront explore card, the dashboard stat card, the
 * order card, the transaction card and the shipping-option card — and this
 * component is none of them. It is the plain bordered box those cards could be
 * built ON, used today mostly for settings and wallet rows. `Surface` says that;
 * `Card` implied it was the product card and nobody reached for it.
 *
 * Replaces the ad-hoc `border border-outline rounded-xl p-3 px-4` /
 * `py-3 px-2` markup that drifted page-to-page. One border, one radius
 * (`rounded-card` = 16px token), one padding (`p-4`), one bg. Pass row
 * layout etc. via `className`.
 *
 * An interactive card renders a real `<button>`. It was a `<div onClick>`,
 * which is not focusable, exposes no role and ignores Enter and Space — the
 * same defect Checkbox and the auth CTAs had.
 */
export default function Surface({ children, className, onClick, ariaLabel }: SurfaceProps) {
  const base = "border border-outline rounded-card bg-surface p-4";

  if (!onClick) {
    return <div className={cn(base, className)}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(base, "w-full text-left cursor-pointer", focusRing, className)}>
      {children}
    </button>
  );
}
