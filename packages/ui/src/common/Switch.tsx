"use client";

import React from "react";
import { cn } from "@vibaar/utils";

export type SwitchProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "color" | "size"
> & {
  /** Visual treatment used for the checked track. */
  variant?: "success" | "brand";
  /** Classes for the 36px interaction container; `className` targets the input. */
  containerClassName?: string;
};

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    checked,
    disabled = false,
    variant = "success",
    className,
    containerClassName,
    ...inputProps
  },
  ref
) {
  return (
    <label
      className={cn(
        "inline-flex min-h-9 min-w-9 items-center justify-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        containerClassName
      )}>
      <input
        {...inputProps}
        ref={ref}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        className={cn("peer sr-only", className)}
      />
      <span
        aria-hidden="true"
        className="relative rounded-pill peer-focus-visible:ring-2 peer-focus-visible:ring-brandDeep/40 peer-focus-visible:ring-offset-1">
        <span
          className={cn(
            "block h-5 w-8 rounded-pill transition-colors duration-200 ease-linear",
            checked
              ? variant === "brand"
                ? "bg-brand"
                : "bg-success-foreground"
              : "bg-surface-strong",
            disabled && "opacity-50"
          )}
        />
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-pill border border-outline-strong bg-surface transition-transform duration-200 ease-linear",
            checked && "translate-x-3"
          )}
        />
      </span>
    </label>
  );
});

export default Switch;
