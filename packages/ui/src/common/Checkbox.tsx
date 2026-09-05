"use client";

import React from "react";
import { IoCheckmark } from "../icons";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

type CheckboxProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "type" | "className" | "aria-checked" | "role"
> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** When set, renders the labeled checkmark style; omit for the standalone box. */
  label?: string;
  /** Box variant only: round vs. rounded-square (was the separate CustomCheckbox). */
  isRound?: boolean;
  disabled?: boolean;
  className?: string;
  /** Required when there is no `label`, so the control has an accessible name. */
  ariaLabel?: string;
};

/**
 * Unified checkbox primitive — labeled (checkmark + text) or standalone box.
 * Selection cue matches RadioGroup: neutral ring when unchecked, brand fill +
 * ink check when checked.
 *
 * This was a `<div onClick>`: not focusable, exposing no role, and ignoring
 * Space and Enter — so it was unusable by keyboard and invisible to assistive
 * tech. It is now a real button with `role="checkbox"` and `aria-checked`,
 * which gives keyboard activation for free and lets the shared focus ring apply.
 */
const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, onChange, label, isRound = false, disabled = false, className, ariaLabel, ...rest },
  ref
) {
  const box = (
    <span
      aria-hidden="true"
      className={cn(
        "w-5 h-5 border-2 flex items-center justify-center transition-colors flex-shrink-0",
        isRound ? "rounded-full" : "rounded",
        checked ? "bg-brand border-brandDeep" : "border-outline-emphasis"
      )}>
      {checked && <IoCheckmark className="text-brandInk" size={14} strokeWidth={3} />}
    </span>
  );

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 rounded transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        !disabled && "cursor-pointer",
        focusRing,
        className
      )}>
      {box}
      {label && <span className="text-foreground-primary text-body">{label}</span>}
    </button>
  );
});

export default Checkbox;
