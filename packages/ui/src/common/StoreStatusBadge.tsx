"use client";

import { cn } from "@vibaar/utils";
import Badge from "./Badge";

interface StoreStatusBadgeProps {
  isActive?: boolean;
  className?: string;
}

/**
 * Store status = the shared `Badge` preset for whether a storefront is live.
 *
 * It owns one decision — live reads as `success`, inactive as `neutral` — and
 * nothing about appearance. It used to hand-roll its own dot, type scale and
 * two-branch colour logic, which is how "a small tone-carrying label" ended up
 * implemented four separate ways across the app.
 */
const StoreStatusBadge = ({ isActive = true, className = "" }: StoreStatusBadgeProps) => (
  <Badge
    tone={isActive ? "success" : "neutral"}
    variant="plain"
    dot
    // The shipped label was medium weight; Badge's plain variant is
    // weightless by design, so the preset states it.
    className={cn("font-medium", className)}>
    {isActive ? "Live" : "Inactive"}
  </Badge>
);

export default StoreStatusBadge;
