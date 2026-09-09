"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@vibaar/utils";
import Spinner from "./Spinner";
import Badge from "./Badge";
import { focusRing } from "../styles";

/**
 * `bar` is the stacked icon-over-label form used by the mobile bars. `rail` is
 * the horizontal row used by the desktop sidebar, where the active destination
 * reads as a tinted pill rather than a colour change alone.
 */
export type NavItemVariant = "bar" | "rail";

export interface NavItemProps {
  href: string;
  /**
   * The glyph. A node rather than a component type, so a caller can hand over
   * artwork that differs between states without NavItem needing to know that
   * such a distinction exists.
   */
  icon: ReactNode;
  /**
   * Accessible name — REQUIRED, and the reason this primitive exists. The
   * buyer bottom nav was three icon-only links with no name at all: a screen
   * reader announced "link", "link", "link" on every buyer screen.
   */
  label: string;
  /** Also render the label under the glyph. Off = visually hidden but announced. */
  showLabel?: boolean;
  /** Marks the destination the viewer is already on. */
  active?: boolean;
  /** Swap the glyph for a spinner while this destination is being navigated to. */
  loading?: boolean;
  /** Spinner diameter. Match the glyph or the row shifts when it appears. */
  spinnerSize?: number;
  /** Count badge — e.g. items in the cart. */
  badge?: number;
  /**
   * What the badge means, for screen readers. The cart badge used to be a bare
   * coloured dot: sighted users saw "you have items", everyone else got
   * nothing at all.
   */
  badgeLabel?: string;
  /** Fired on activation — for a caller tracking its own loading state. */
  onNavigate?: () => void;
  /** Blocks navigation without removing the item from the tab order. */
  disabled?: boolean;
  variant?: NavItemVariant;
  className?: string;
}

const VARIANT: Record<NavItemVariant, { base: string; active: string; idle: string }> = {
  bar: {
    base: "flex-col justify-center gap-1",
    active: "text-brandDeep",
    idle: "text-foreground-muted",
  },
  rail: {
    base: "w-full flex-row justify-start gap-3 px-4 py-3 rounded-field text-body",
    active: "bg-brand/10 text-brandDeep font-semibold",
    idle: "text-foreground-secondary hover:bg-surface-muted font-medium",
  },
};

/**
 * NavItem — one destination in a navigation bar.
 *
 * The app had four of these and no two agreed on what a nav item even is: the
 * buyer bar used links, the seller bars used buttons calling router.push, and
 * the spotlights bar used a plain div with an onClick. Only the first was
 * reachable by keyboard, and none of them said which destination you were on.
 *
 * It renders a LINK, deliberately — these change the URL, so they are
 * navigation. Buttons cannot be middle-clicked, opened in a new tab, or have
 * their address copied, and `aria-current="page"` is what makes the active
 * destination survive being read aloud rather than existing only as a colour.
 * Same reasoning as NavigationTabs.
 */
export default function NavItem({
  href,
  icon,
  label,
  showLabel = false,
  active = false,
  loading = false,
  spinnerSize = 22,
  badge,
  badgeLabel,
  onNavigate,
  disabled = false,
  variant = "bar",
  className,
}: NavItemProps) {
  const styles = VARIANT[variant] ?? VARIANT.bar;
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled || undefined}
      // A disabled link keeps its place in the tab order — removing it would
      // shift focus order every time a sibling starts loading.
      tabIndex={disabled ? -1 : undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onNavigate?.();
      }}
      className={cn(
        "flex items-center transition-colors",
        styles.base,
        focusRing,
        active ? styles.active : styles.idle,
        disabled && "opacity-50 pointer-events-none",
        className
      )}>
      <span className="relative flex items-center justify-center">
        {loading ? <Spinner size={spinnerSize} /> : icon}
        {badge !== undefined && badge > 0 && (
          <Badge
            tone="brand"
            variant="solid"
            className="absolute -top-1.5 -right-2 min-w-[18px] justify-center px-1 ring-1 ring-white"
            srLabel={badgeLabel}>
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </span>
      {/* The label is always present for assistive tech; `showLabel` only
          decides whether it is also drawn. */}
      <span
        className={
          showLabel ? (variant === "rail" ? undefined : "text-caption font-medium") : "sr-only"
        }>
        {label}
      </span>
    </Link>
  );
}
