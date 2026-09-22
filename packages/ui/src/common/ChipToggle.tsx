"use client";

import React from "react";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";

type ChipToggleProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "aria-pressed"
> & {
  /** Whether this chip is the selected one. Drives `aria-pressed`. */
  selected: boolean;
  /**
   * `onDark` for a chip sitting over imagery — a vendor card's Follow control
   * on the shopper's photo backdrop. The default pair is built for a light
   * surface and disappears on one. Without this the two toggles that live over
   * photos were hand-rolled as bare `text-white` buttons with no pressed state.
   */
  tone?: "default" | "onDark";
  children: React.ReactNode;
};

/**
 * ChipToggle — a pill that is either on or off.
 *
 * The app had this control twice and spelled it differently each time: the
 * marketplace/storefront filter pills, and the product page's variant chips.
 * They mean the same thing — "narrow this / choose this" — and a shopper meets
 * both within one journey, so they must look and behave identically.
 *
 * They did not. The filter pills were `bg-surface-inverse / text-foreground-inverse`
 * when active; the variant chips were a raw `bg-black text-white`. The pills were
 * 36px tall, the chips 22px — under the touch minimum, on the control you must
 * operate to buy anything with variants. Only the pills carried `aria-pressed`,
 * and only the pills declared `type="button"`, so a variant chip inside a form
 * would have submitted it.
 *
 * A toggle, not a tab and not a link: `aria-pressed` is the state, so the
 * selected chip is announced as pressed rather than being distinguishable only
 * by colour.
 */
const ChipToggle = React.forwardRef<HTMLButtonElement, ChipToggleProps>(
  function ChipToggle({ selected, tone = "default", className, children, ...rest }, ref) {
    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={cn(
          "inline-flex min-h-9 items-center whitespace-nowrap rounded-pill px-4 text-body-sm transition-colors",
          focusRing,
          tone === "onDark"
            ? selected
              ? "bg-white/25 font-medium text-white"
              : "text-white hover:bg-white/15"
            : selected
              ? "bg-surface-inverse font-medium text-foreground-inverse"
              : "bg-surface-subtle text-foreground-primary hover:bg-surface-muted",
          className
        )}>
        {children}
      </button>
    );
  }
);

export default ChipToggle;
