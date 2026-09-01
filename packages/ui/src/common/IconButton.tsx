import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@vibaar/utils";
import { IconProps } from "../icons";

// Icon-button system — the single primitive for "an icon in a tappable container".
// Standardises touch-target size, icon scale, radius, and hover/active states so
// every header/topbar/list action reads consistently. Companion to Button (which
// is for labelled CTAs); reach for IconButton whenever the control is icon-only.
//   variant — plain (dark icon on light) · muted (secondary dark) · onDark (white
//             icon on hero/colored bg) · filled (brand pill) · soft (brand tint pill)
//   size    — sm 32px · md 36px (default, meets 36px touch min) · lg 44px
const iconButtonVariants = cva(
  "inline-flex items-center justify-center shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none touch-manipulation cursor-pointer",
  {
    variants: {
      variant: {
        plain: "text-ink-90 hover:bg-ink-5 active:bg-ink-10",
        muted: "text-ink-60 hover:bg-ink-5 active:bg-ink-10",
        onDark: "text-white hover:bg-white/10 active:bg-white/20",
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

type IconButtonProps = {
  /** Icon component from `../icons`. */
  icon: React.ComponentType<IconProps>;
  /** Accessible name — required since the button has no visible text. */
  label: string;
  onClick?: () => void;
  className?: string;
  iconClassName?: string;
  /** Override the size-derived icon dimension when a design needs it. */
  iconSize?: number;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
} & VariantProps<typeof iconButtonVariants>;

export default function IconButton({
  icon: Icon,
  label,
  onClick,
  className = "",
  iconClassName,
  iconSize,
  disabled = false,
  type = "button",
  variant = "plain",
  size = "md",
}: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(iconButtonVariants({ variant, size }), className)}>
      <Icon size={iconSize ?? ICON_SIZE[size ?? "md"]} className={iconClassName} />
    </button>
  );
}
