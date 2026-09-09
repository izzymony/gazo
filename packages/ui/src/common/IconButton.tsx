"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@vibaar/utils";
import { focusRing } from "../styles";
import type { IconProps } from "../icons";

// Icon-button system — the single primitive for "an icon in a tappable container".
// Standardises touch-target size, icon scale, radius, and hover/active states so
// every header/topbar/list action reads consistently. Companion to Button (which
// is for labelled CTAs); reach for IconButton whenever the control is icon-only.
//   variant — plain (dark icon on light) · muted (secondary dark) · onDark (white
//             icon on hero/colored bg) · filled (brand pill) · soft (brand tint pill)
//   size    — sm 32px · md 36px (default, meets 36px touch min) · lg 44px
const iconButtonVariants = cva(
  cn(
    "inline-flex items-center justify-center shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none touch-manipulation cursor-pointer",
    focusRing
  ),
  {
    variants: {
      variant: {
        plain: "text-foreground-primary hover:bg-surface-muted active:bg-surface-strong",
        muted: "text-foreground-secondary hover:bg-surface-muted active:bg-surface-strong",
        onDark: "text-white hover:bg-surface/10 active:bg-surface/20",
        // Chrome sitting ON a photograph — a wishlist heart on a product image,
        // a close control over a full-bleed viewer. It carries its own scrim
        // because the image underneath is not a known colour.
        overlay:
          "bg-overlay/15 text-white backdrop-blur-sm hover:bg-overlay/30 active:bg-overlay/40",
        // On a brand-yellow surface. White here is 1.28:1 — invisible.
        onBrand: "text-brandInk hover:bg-brandInk/10 active:bg-brandInk/20",
        filled: "bg-brand text-brandInk hover:bg-brandHover active:bg-brandHover",
        soft: "bg-brand/10 text-brandDeep hover:bg-brand/20",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
        lg: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "plain", size: "md" },
  }
);

const ICON_SIZE: Record<NonNullable<VariantProps<typeof iconButtonVariants>["size"]>, number> = {
  sm: 18,
  md: 22,
  lg: 24,
};

/**
 * Native <button> attributes are spread onto the element, matching Button, so
 * aria-*, id, form, data-* and the rest work without enumeration.
 */
type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "type" | "disabled" | "aria-label"
> & {
  /** Icon component from `../icons`. */
  icon: React.ComponentType<IconProps>;
  /** Accessible name — required since the button has no visible text. */
  label: string;
  className?: string;
  iconClassName?: string;
  /** Override the size-derived icon dimension when a design needs it. */
  iconSize?: number;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
} & VariantProps<typeof iconButtonVariants>;

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon: Icon,
    label,
    className = "",
    iconClassName,
    iconSize,
    disabled = false,
    type = "button",
    variant = "plain",
    size = "md",
    // Pulled out of `rest` because it collides with a value this component
    // controls; `rest` is spread first so the controlled values win.
    style,
    ...rest
  },
  ref
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled}
      // `label` is the whole point of this primitive: an icon-only control with
      // no accessible name is unusable, so it is required and not overridable.
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      style={style}>
      <Icon size={iconSize ?? ICON_SIZE[size ?? "md"]} className={iconClassName} />
    </button>
  );
});

export default IconButton;
