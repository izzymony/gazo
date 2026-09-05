"use client";

import React from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

/**
 * DisclosureButton — the trigger for anything that expands and collapses.
 *
 * Behaviour only. It owns what every hand-rolled disclosure in the app was
 * missing — a real `<button type="button">`, `aria-expanded` bound to the
 * region's state, an optional `aria-controls` link, and a focus ring — and
 * owns NOTHING visual. The caller's `className` is the entire appearance, so
 * a chevron section header and an inline "Read more" link are both this
 * component with different classes, and migrating a call site is a
 * class-for-class swap.
 *
 * `type` is forced to "button": a disclosure never submits a form. Native
 * attributes spread first so `aria-expanded` cannot be overridden — the same
 * spread-order rule Button and IconButton follow.
 */
type DisclosureButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "aria-expanded" | "aria-controls"
> & {
  /** Whether the controlled region is currently shown. Drives `aria-expanded`. */
  expanded: boolean;
  /** `id` of the region this button shows/hides, for `aria-controls`. */
  controls?: string;
  children: React.ReactNode;
};

const DisclosureButton = React.forwardRef<HTMLButtonElement, DisclosureButtonProps>(
  function DisclosureButton({ expanded, controls, className, children, ...rest }, ref) {
    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        aria-expanded={expanded}
        aria-controls={controls}
        className={cn(focusRing, className)}>
        {children}
      </button>
    );
  }
);

export default DisclosureButton;
