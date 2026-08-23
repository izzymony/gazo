import type { AppNotification } from "@/hooks/useNotifications";

// Shared display helpers for the notification feed + the dashboard-home preview,
// so both render Mailbox B notifications identically.

/** Icon key understood by ActivityItem, derived from the notice-first title. */
export const iconFor = (n: AppNotification): string => {
  const t = n.title.toLowerCase();
  if (t.includes("deliver")) return "check_circle";
  if (t.includes("out for delivery") || t.includes("transit") || t.includes("preparing") || t.includes("new order")) return "local_shipping";
  if (t.includes("cancel")) return "Close_Circle";
  if (t.includes("refund") || t.includes("payment") || t.includes("funds") || t.includes("withdrawal")) return "Dollar Circle";
  if (t.includes("stock") || t.includes("sold out")) return "Danger_Triangle";
  if (t.includes("review")) return "star";
  if (t.includes("wishlist") || t.includes("price") || t.includes("saved") || t.includes("almost gone")) return "heart";
  if (t.includes("verif") || t.includes("kyc")) return "check_circle";
  if (t.includes("welcome")) return "star";
  if (n.type === "order") return "sell";
  return "info";
};

/** Relative time label ("Just now", "7 min ago", "Yesterday", …). */
export const formatTime = (timestamp?: string): string => {
  if (!timestamp) return "Recently";
  try {
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (Number.isNaN(diffMs)) return "Recently";
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
};
