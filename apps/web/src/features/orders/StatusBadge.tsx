import React from "react";
import Badge, { type BadgeTone } from "@vibaar/ui/common/Badge";
import { ORDER_STATUS } from "@/features/orders/orderStatus";

/**
 * Order/entity status pill.
 *
 * Lives in features/orders because it is order-domain, not seller-only — the
 * buyer order list and order detail render the same statuses. It previously
 * sat under features/seller-dashboard, which is why the buyer side grew its own
 * 20-entry raw-hex copy instead of importing this.
 *
 * It now owns only the DECISION (which status reads as which tone) and defers
 * every appearance question to the shared `Badge`. It used to carry its own
 * `BADGE_HUE` table of literal palette classes — one of four independent
 * tone-to-colour systems in the app, and the reason a green pill and a teal
 * pill had visibly different border weights.
 */

type BadgeSize = "sm" | "md";

interface StatusBadgeProps {
  status: string;
  /** Chip size. `sm` (default) is compact; `md` is roomier. */
  size?: BadgeSize;
}

/**
 * Non-order statuses (product / customer) → tone. Order statuses resolve via
 * the shared ORDER_STATUS config, so the pill and the timeline icon cannot
 * drift apart. Keys lowercased.
 */
const EXTRA_TONE: Record<string, BadgeTone> = {
  active: "emerald", // product
  draft: "neutral", // product
  new: "teal", // customer (distinct from "new order received")
  returning: "indigo", // customer
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  const key = status.toLowerCase();
  const tone = ORDER_STATUS[key]?.tone ?? EXTRA_TONE[key] ?? "info";
  return (
    <Badge tone={tone} size={size}>
      {status}
    </Badge>
  );
};

export default StatusBadge;
