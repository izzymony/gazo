import React from "react";
import { cn } from "@/lib/utils";
import type { BadgeTone } from "@vibaar/ui/common/Badge";
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

/**
 * The tones an order status can take. A subset of the design system's
 * `BadgeTone` — order stages need mutually distinguishable colours, so most are
 * categorical hues rather than semantic tones ("in transit" is not a warning).
 * Typed against BadgeTone so an unknown tone is a compile error, not a badge
 * that silently falls back to neutral.
 */
export type StatusTone = Extract<
  BadgeTone,
  "info" | "teal" | "warning" | "orange" | "purple" | "sky" | "success" | "error"
>;

type Glyph = React.FC<{ size?: number; className?: string }>;

/**
 * SINGLE SOURCE OF TRUTH for order-status presentation: each status → its tone +
 * icon. The text pill (`StatusBadge`) and the timeline icon (`OrderStatusIcon`)
 * both read the tone from here, so they can never drift out of sync. Keys are the
 * order-activity `title.toLowerCase()`.
 *
 * Replaces the 818-line hardcoded `pickers` SVG map that used to live in
 * `design-system/svg.tsx` (23 order statuses × an inline colored-circle icon).
 */
export const ORDER_STATUS: Record<string, { tone: StatusTone; icon: Glyph }> = {
  "order placed": { tone: "info", icon: ShoppingBag },
  "new order received": { tone: "info", icon: Bell },
  "payment confirmed": { tone: "teal", icon: Wallet },
  "processing for shipping": { tone: "warning", icon: Package },
  "ready for shipping": { tone: "warning", icon: Package },
  "shipping created & assigned to a courier": { tone: "warning", icon: DeliveryTruck },
  "shipment created & assigned to a courier": { tone: "warning", icon: DeliveryTruck },
  "shipping started": { tone: "warning", icon: DeliveryTruck },
  "shipping confirmed": { tone: "warning", icon: DeliveryTruck },
  "courier processing shipping": { tone: "warning", icon: DeliveryTruck },
  "courier accepted shipping": { tone: "warning", icon: DeliveryTruck },
  "waiting to be shipped": { tone: "warning", icon: Clock },
  "rider on the way to vendor": { tone: "orange", icon: DeliveryTruck },
  "order picked up & in transit": { tone: "purple", icon: DeliveryTruck },
  "order picked up": { tone: "purple", icon: Package },
  "package picked up": { tone: "purple", icon: Package },
  "order in transit": { tone: "purple", icon: DeliveryTruck },
  "out for delivery": { tone: "sky", icon: DeliveryTruck },
  "shipped": { tone: "sky", icon: DeliveryTruck },
  "order delivered": { tone: "success", icon: CircleCheck },
  "order cancelled": { tone: "error", icon: X },
  "delivery attempt failed": { tone: "error", icon: AiOutlineInfoCircle },
  "order returned to vendor": { tone: "error", icon: ArrowLeft },
};

/**
 * Icon circle (OrderStatusIcon): the tone's `surface-strong` tint behind its
 * `foreground` glyph. Literal strings for Tailwind's JIT. These were raw
 * palette classes (`bg-teal-100 text-teal-600`); as tokens they are covered by
 * the contrast contract, which the -600 glyph shade was failing.
 */
const ICON_TONE: Record<StatusTone, string> = {
  info: "bg-info-surface-strong text-info-foreground",
  teal: "bg-hue-teal-surface-strong text-hue-teal-foreground",
  warning: "bg-warning-surface-strong text-warning-foreground",
  orange: "bg-hue-orange-surface-strong text-hue-orange-foreground",
  purple: "bg-hue-purple-surface-strong text-hue-purple-foreground",
  sky: "bg-hue-sky-surface-strong text-hue-sky-foreground",
  success: "bg-success-surface-strong text-success-foreground",
  error: "bg-error-surface-strong text-error-foreground",
};

/**
 * Order-timeline status icon — the icon counterpart of `StatusBadge`. Renders the
 * status glyph in a tone-tinted 60px circle (the glyph inherits the tone's
 * foreground via currentColor). Unknown status → null (matches the old
 * `pickers[x]` behaviour).
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
        ICON_TONE[entry.tone],
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
