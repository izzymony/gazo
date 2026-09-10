"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Plus } from "@vibaar/ui/icons";
import { focusRing } from "@vibaar/ui/styles";

interface FloatingActionProps {
  /** Destination. A floating add action always goes somewhere. */
  href: string;
  /** Accessible name — the control has no visible text. */
  label: string;
  className?: string;
}

/**
 * FloatingAction — the one floating "add" control.
 *
 * There were four floating controls above the seller's bottom nav, each one
 * hand-rolled and each one guessing its own clearance from the nav's 60px:
 * the catalog's add button at `bottom-28`, its "View store front" bar at
 * `bottom-[80px]`, the storefront's add button at `bottom-20`, and the mode
 * switch at `bottom-[72px]`. Two of them drew their own 48px circle with an
 * inline `boxShadow` rather than using IconButton, and one re-derived the
 * `max-w-5xl` container maths inside a `lg:right-[calc(...)]` class.
 *
 * Three rules, in one place:
 *
 * • `fixed`, never `absolute`. An absolute control resolves against the nearest
 *   positioned ancestor, and inside a scrolling page that means it scrolls with
 *   the content — which is exactly what the catalog's button did.
 * • ONE offset. `bottom-20` (80px) clears the 60px nav with a 20px gap, and is
 *   on the spacing scale.
 * • BELOW the nav in z. The nav is `z-sticky`; a control that floats over the
 *   page must not float over the navigation, so it is `z-dropdown`.
 */
export default function FloatingAction({ href, label, className }: FloatingActionProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "fixed bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full",
        "bg-brand text-brandInk shadow-pop transition-colors hover:bg-brandHover active:bg-brandHover",
        "z-dropdown lg:bottom-6",
        focusRing,
        className
      )}>
      <Plus size={24} aria-hidden="true" />
    </Link>
  );
}
