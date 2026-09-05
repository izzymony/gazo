import React from "react";
import { cn } from "@/lib/utils";
import { ORDER_STATUS, BADGE_HUE } from "@/features/orders/orderStatus";

/**
 * Order/entity status pill.
 *
 * Lives in features/orders because it is order-domain, not seller-only — the
 * buyer order list and order detail render the same statuses. It previously
 * sat under features/seller-dashboard, which is why the buyer side grew its own
 * 20-entry raw-hex copy instead of importing this.
 *
 * Consolidates the 3 former near-identical copies (orders / products / customers).
 * Order-status hues come from the shared `ORDER_STATUS` config so the pill and the
 * timeline `OrderStatusIcon` can never drift out of sync; product/customer statuses
 * are kept local. Colors are Tailwind-palette utility classes (no hex, no bespoke
 * tokens) — each hue maps to a literal class string so Tailwind's JIT keeps them.
 */

type BadgeSize = "sm" | "md";

interface StatusBadgeProps {
  status: string;
  /** Chip size. `sm` (default) is compact; `md` is roomier. */
  size?: BadgeSize;
}

// Size variants — control text + padding independent of color.
const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "text-caption px-2 py-[1px]",
  md: "text-body-sm px-2.5 py-0.5",
};

// Non-order statuses (product / customer) → hue. Order statuses resolve via the
// shared ORDER_STATUS config. Keys lowercased.
const EXTRA_HUE: Record<string, string> = {
  active: "emerald", // product
  draft: "ink", // product (neutral)
  new: "teal", // customer (distinct from "new order received")
  returning: "indigo", // customer
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  const key = status.toLowerCase();
  const hue = ORDER_STATUS[key]?.hue ?? EXTRA_HUE[key] ?? "blue";
  const styles = BADGE_HUE[hue] ?? BADGE_HUE.blue;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-pill border border-solid leading-none",
        SIZE_STYLES[size],
        styles
      )}>
      {status}
    </span>
  );
};

export default StatusBadge;
