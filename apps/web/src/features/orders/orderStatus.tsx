import React from "react";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Bell,
  Wallet,
  Package,
  DeliveryTruck,
  Clock,
  CircleCheck,
  X,
  AiOutlineInfoCircle,
  ArrowLeft,
} from "@vibaar/ui/icons";

export type StatusHue =
  | "blue"
  | "teal"
  | "yellow"
  | "orange"
  | "purple"
  | "sky"
  | "green"
  | "red";

type Glyph = React.FC<{ size?: number; className?: string }>;

/**
 * SINGLE SOURCE OF TRUTH for order-status presentation: each status → its hue +
 * icon. The text pill (`StatusBadge`) and the timeline icon (`OrderStatusIcon`)
 * both read the hue from here, so they can never drift out of sync. Keys are the
 * order-activity `title.toLowerCase()`.
 *
 * Replaces the 818-line hardcoded `pickers` SVG map that used to live in
 * `design-system/svg.tsx` (23 order statuses × an inline colored-circle icon).
 */
export const ORDER_STATUS: Record<string, { hue: StatusHue; icon: Glyph }> = {
  "order placed": { hue: "blue", icon: ShoppingBag },
  "new order received": { hue: "blue", icon: Bell },
  "payment confirmed": { hue: "teal", icon: Wallet },
  "processing for shipping": { hue: "yellow", icon: Package },
  "ready for shipping": { hue: "yellow", icon: Package },
  "shipping created & assigned to a courier": { hue: "yellow", icon: DeliveryTruck },
  "shipment created & assigned to a courier": { hue: "yellow", icon: DeliveryTruck },
  "shipping started": { hue: "yellow", icon: DeliveryTruck },
  "shipping confirmed": { hue: "yellow", icon: DeliveryTruck },
  "courier processing shipping": { hue: "yellow", icon: DeliveryTruck },
  "courier accepted shipping": { hue: "yellow", icon: DeliveryTruck },
  "waiting to be shipped": { hue: "yellow", icon: Clock },
  "rider on the way to vendor": { hue: "orange", icon: DeliveryTruck },
  "order picked up & in transit": { hue: "purple", icon: DeliveryTruck },
  "order picked up": { hue: "purple", icon: Package },
  "package picked up": { hue: "purple", icon: Package },
  "order in transit": { hue: "purple", icon: DeliveryTruck },
  "out for delivery": { hue: "sky", icon: DeliveryTruck },
  "shipped": { hue: "sky", icon: DeliveryTruck },
  "order delivered": { hue: "green", icon: CircleCheck },
  "order cancelled": { hue: "red", icon: X },
  "delivery attempt failed": { hue: "red", icon: AiOutlineInfoCircle },
  "order returned to vendor": { hue: "red", icon: ArrowLeft },
};

/**
 * Literal per-hue class strings for the TEXT PILL (StatusBadge): -50 tint / -700
 * text / -600 border. Tailwind JIT only keeps classes it sees as literals, so
 * these must never be built as `bg-${hue}-50`. Includes the extra product/customer
 * hues StatusBadge needs beyond the order set.
 */
export const BADGE_HUE: Record<string, string> = {
  blue: "bg-info-surface text-info-foreground border-info-border",
  teal: "bg-teal-50 text-teal-700 border-teal-600",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-500",
  orange: "bg-orange-50 text-orange-600 border-orange-500",
  purple: "bg-purple-50 text-purple-700 border-purple-600",
  sky: "bg-sky-50 text-sky-700 border-sky-600",
  green: "bg-success-surface text-success-foreground border-success-border",
  red: "bg-error-surface text-error-foreground border-error-border",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-600",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-600",
  ink: "bg-surface-subtle text-foreground-muted border-outline-emphasis",
};

// Icon circle (OrderStatusIcon): -100 tint bg / -600 glyph (via currentColor).
// Matches the shades the old `pickers` circles used. Literal strings for JIT.
const ICON_HUE: Record<StatusHue, string> = {
  blue: "bg-info-surface text-info-foreground",
  teal: "bg-teal-100 text-teal-600",
  yellow: "bg-yellow-100 text-yellow-600",
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-purple-100 text-purple-600",
  sky: "bg-sky-100 text-sky-600",
  green: "bg-success-surface text-success-foreground",
  red: "bg-error-surface text-error-foreground",
};

/**
 * Order-timeline status icon — the icon counterpart of `StatusBadge`. Renders the
 * status glyph in a hue-tinted 60px circle (the glyph inherits the -600 color via
 * currentColor). Unknown status → null (matches the old `pickers[x]` behaviour).
 */
export function OrderStatusIcon({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const entry = ORDER_STATUS[status?.toLowerCase?.() ?? ""];
  if (!entry) return null;
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "flex h-[60px] w-[60px] items-center justify-center rounded-full",
        ICON_HUE[entry.hue],
        className
      )}>
      <Icon size={28} />
    </span>
  );
}

/**
 * Seller-facing display status. Self-delivery has no fulfilment step between
 * "Payment confirmed" and the seller's own "Out for delivery" — so a paid Self
 * order would otherwise sit on "Payment confirmed" with no signal that it's
 * waiting on the seller to ship. Derive "Waiting to be shipped" for that state
 * (the courier path already gets "Shipping started" from the shipment). Purely a
 * display derivation off the real activity — the timeline is unchanged.
 */
export function deriveSellerStatus(order: {
  seller_activity?: { title: string }[] | null;
  shipping_option?: { provider?: string } | null;
  shipment?: { provider?: string } | null;
}): string {
  const acts = order?.seller_activity;
  const last = acts && acts.length > 0 ? acts[acts.length - 1].title : "";
  const isSelf =
    order?.shipping_option?.provider === "self" ||
    order?.shipment?.provider === "self";
  if (isSelf && (last === "Payment confirmed" || last === "New order received")) {
    return "Waiting to be shipped";
  }
  return last;
}
