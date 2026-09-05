import React, { ReactNode } from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** When set the whole card becomes a real button — focusable and keyboard-operable. */
  onClick?: () => void;
  /** Accessible name for an interactive card whose content is not self-describing. */
  ariaLabel?: string;
}

/**
 * Card — the canonical bordered surface (design-system content layer).
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
export default function Card({ children, className, onClick, ariaLabel }: CardProps) {
  const base = "border border-outline rounded-card bg-white p-4";

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
