"use client";

import ListItem from "../common/ListItem";

interface ActivityItemProps {
  /** Icon key — mapped to an illustration in /public/icons. */
  icon: string;
  title: string;
  /** Optional secondary message line. */
  message?: string;
  time: string;
  /** Unread → bolder title + a dot on the badge. */
  unread?: boolean;
  onClick?: () => void;
  /** Render as an <li> for use inside `List`. Passed through to ListItem. */
  asListItem?: boolean;
}

/**
 * ActivityItem — the activity / notification list row.
 *
 * One preset for both "Recent activities" (dashboard home) and the notifications
 * list, which were byte-identical copies (RecentActivityCard === NotificationCard).
 * Built on ListItem so it shares the app-wide row rhythm with TransactionCard.
 */
export default function ActivityItem({
  icon,
  title,
  message,
  time,
  unread,
  onClick,
  asListItem = false,
}: ActivityItemProps) {
  return (
    <ListItem
      asListItem={asListItem}
      onClick={onClick}
      showDot={unread}
      leading={
        <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center">
          <ActivityIcon type={icon} />
        </div>
      }
      title={<span className={unread ? "font-medium" : ""}>{title}</span>}
      subtitle={message}
      meta={time}
      trailing={
        <svg
          className="w-4 h-4 text-foreground-muted mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      }
    />
  );
}

function ActivityIcon({ type }: { type: string }) {
  const iconFileName = ACTIVITY_ICON_MAP[type] || "star.svg";
  return (
    <div className="w-[22px] h-[22px] flex items-center justify-center">
      <img
        src={`/icons/${iconFileName}`}
        alt={`${type} icon`}
        className="w-full h-full object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/icons/star.svg";
        }}
      />
    </div>
  );
}

/** Icon key → illustration filename. Shared by every activity/notification row. */
const ACTIVITY_ICON_MAP: Record<string, string> = {
  // Order-related
  sell: "Activities icons/New order.svg",
  new_order: "Activities icons/New order.svg",
  local_shipping: "Activities icons/Shipment assisned.svg",
  processing_started: "Activities icons/Order procedding started.svg",
  picked_up: "Activities icons/Order picked up and in transit.svg",
  rider_enroute: "Activities icons/Rider en route to pickup.svg",
  check_circle: "Activities icons/Order delivered.svg",
  delivered: "Activities icons/Order delivered.svg",
  Close_Circle: "Activities icons/Order cancelled by buyer.svg",
  cancelled: "Activities icons/Order cancelled by buyer.svg",
  reply: "Activities icons/Order returned to vendor.svg",
  returned: "Activities icons/Order returned to vendor.svg",
  return_requested: "Activities icons/Return requested for order.svg",
  Danger_Circle: "Activities icons/Delivery attempt failed.svg",
  delivery_failed: "Activities icons/Delivery attempt failed.svg",

  // Payment / Wallet
  "Dollar Circle": "Activities icons/Payment confirmed.svg",
  payment_confirmed: "Activities icons/Payment confirmed.svg",
  Wallet: "Activities icons/Wallet credited.svg",
  wallet_credited: "Activities icons/Wallet credited.svg",
  payments: "Activities icons/Payment confirmed.svg",
  trending_up: "Activities icons/Payout sent to bank.svg",
  payout_sent: "Activities icons/Payout sent to bank.svg",
  trending_down: "Activities icons/Deducted for refund.svg",
  deducted_refund: "Activities icons/Deducted for refund.svg",

  // Store
  Danger_Triangle: "Activities icons/Low stock alert.svg",
  low_stock: "Activities icons/Low stock alert.svg",
  heart: "Activities icons/Product added to wishlist.svg",
  added_wishlist: "Activities icons/Product added to wishlist.svg",
  add_shopping_cart: "Activities icons/Product added to cart.svg",
  added_cart: "Activities icons/Product added to cart.svg",
  star: "Activities icons/Recieved a review.svg",
  received_review: "Activities icons/Recieved a review.svg",
  sold_out: "Activities icons/Product sold out.svg",

  // System
  settings: "Activities icons/Maintenance scheduled.svg",
  maintenance: "Activities icons/Maintenance scheduled.svg",
  info: "Activities icons/Policy updated.svg",
  policy_updated: "Activities icons/Policy updated.svg",
  feature_released: "Activities icons/New feature releiced.svg",
  kyc_verification: "Activities icons/KYC verification complete.svg",

  // Fallbacks
  celebration: "star.svg",
  notification: "notifications_unread.svg",
  notifications_unread: "notifications_unread.svg",
  store: "store.svg",
  wallet: "Activities icons/Wallet credited.svg",
};
