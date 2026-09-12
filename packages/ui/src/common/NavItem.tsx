"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@vibaar/utils";
import Spinner from "./Spinner";
import Badge from "./Badge";
import { focusRing } from "../styles";

/**
 * `bar` is the stacked icon-over-label form used by edge-to-edge mobile bars.
 * `floating` adds the contained selection surface and 44px touch geometry a
 * floating tab bar needs. `rail` is the horizontal labelled row used by the
 * seller's 256px sidebar. `compact-rail` is the square glyph used by a collapsed
 * icon column — its own variant rather than `rail` with the padding overridden,
 * because `rail` is a full-width row with a full-width selection surface and
 * label geometry, none of which a 5rem column wants.
 */
export type NavItemVariant = "bar" | "floating" | "rail" | "compact-rail";

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
  /*
   * Selection is carried by the glyph first and the surface second. A grey
   * pill on a white bar was ~1.1:1 — present in the DOM, invisible on the
   * screen — so the tint is brand-50 and the glyph goes brandDeep, which is
   * 6.6:1 on it. Hover stays neutral: only the current destination is warm,
   * or a pointer passing over the bar would read as three active tabs.
   */
  floating: {
    base: "min-h-11 flex-col justify-center rounded-pill",
    active: "bg-brand-50 text-brandDeep",
    idle:
      "text-foreground-muted hover:bg-surface-subtle hover:text-foreground-secondary active:bg-surface-muted",
  },
  /*
   * A square target in a narrow column. The selection is carried by the glyph
   * rather than by a filled row: at this width a full-width active surface is
   * most of the rail, which reads as a highlighted column rather than as a
   * chosen destination.
   */
  "compact-rail": {
    base: "size-11 flex-col justify-center rounded-field",
    active: "text-brandDeep",
    idle: "text-foreground-muted hover:bg-surface-muted hover:text-foreground-secondary",
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
          showLabel && variant !== "compact-rail"
            ? variant === "rail"
              ? undefined
              : "text-caption font-medium"
            : "sr-only"
        }>
        {label}
      </span>
    </Link>
  );
}
