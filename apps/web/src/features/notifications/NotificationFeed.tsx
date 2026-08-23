"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import EmptyState from "@/design-system/common/EmptyState";
import Button from "@/design-system/common/Button";
import FilterBar from "@/design-system/common/FilterBar";
import ActivityItem from "@/design-system/common/ActivityItem";
import useAuthStore from "@/store/authStore";
import {
  useNotifications,
  useMarkNotificationRead,
  type AppNotification,
} from "@/hooks/useNotifications";
import { iconFor, formatTime } from "@/features/notifications/notificationDisplay";

// Side-appropriate filter pills. Notification.Type is coarse (order / promo /
// system_alert), so each side maps those three to labels that fit that mode.
const PILL_CONFIG: Record<
  "buyer" | "seller",
  { pills: string[]; label: (type: string) => string }
> = {
  buyer: {
    pills: ["All", "Orders", "Wishlist", "Account"],
    label: (t) => (t === "order" ? "Orders" : t === "promo" ? "Wishlist" : "Account"),
  },
  seller: {
    pills: ["All", "Sales", "Store", "System"],
    label: (t) => (t === "order" ? "Sales" : t === "promo" ? "Store" : "System"),
  },
};

/**
 * The notification feed, scoped to one side. Buyer and seller each get their own
 * route (buyer: /notification, seller: /dashboard/notification) so a mode never
 * shows the other mode's notifications. Both render this one component.
 */
export default function NotificationFeed({ side }: { side: "buyer" | "seller" }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activePill, setActivePill] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [sortOrder, setSortOrder] = useState<"ascending" | "descending">("descending");

  const { pills, label } = PILL_CONFIG[side];

  // Server filters by the authoritative audience field — no client-side guessing.
  const { data: notifications = [], isLoading } = useNotifications(side);
  const markRead = useMarkNotificationRead();

  const filtered = useMemo(() => {
    let list = [...notifications];

    if (searchValue.trim()) {
      const q = searchValue.toLowerCase();
      list = list.filter(
        (n) => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q),
      );
    }

    if (activePill !== 0) {
      const target = pills[activePill];
      list = list.filter((n) => label(n.type) === target);
    }

    return [...list].sort((a, b) =>
      sortOrder === "ascending"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  }, [notifications, searchValue, activePill, sortOrder, pills, label]);

  // Role-neutral routing: mark read, then follow the notification's own action_url.
  const handleClick = useCallback(
    (n: AppNotification) => {
      if (!n.isRead) markRead.mutate(n.id);
      if (n.actionUrl) router.push(n.actionUrl);
    },
    [markRead, router],
  );

  return (
    <PageShell
      header={<Header showBack customText="Notifications" onBackClick={() => router.back()} />}
    >
      <div className="flex flex-col w-full h-full relative">
        <div className="w-full">
          <FilterBar
            pills={pills}
            activePill={activePill}
            onPillChange={setActivePill}
            showSearch
            showSort
            onSortClick={() =>
              setSortOrder((prev) => (prev === "ascending" ? "descending" : "ascending"))
            }
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />
        </div>

        <div className="flex-1 w-full">
          {!user ? (
            <div className="py-16">
              <EmptyState
                image="/images/emptystate/activity_empty_state.svg"
                title="Sign in to see your notifications"
                subtitle="Your orders, payments and updates appear here once you sign in."
              >
                <div className="mt-6 w-full max-w-[220px]">
                  <Button onClick={() => router.push("/signin")}>Sign in</Button>
                </div>
              </EmptyState>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red" />
              <p className="ml-3 text-ink-60">Loading...</p>
            </div>
          ) : (
            <div className="flex flex-col mt-2 pb-24">
              {filtered.length > 0 ? (
                filtered.map((n) => (
                  <ActivityItem
                    key={n.id}
                    icon={iconFor(n)}
                    title={n.title}
                    message={n.message}
                    time={formatTime(n.createdAt)}
                    unread={!n.isRead}
                    onClick={() => handleClick(n)}
                  />
                ))
              ) : (
                <div className="py-12">
                  <EmptyState
                    image="/images/emptystate/activity_empty_state.svg"
                    title={searchValue ? "No matching notifications" : "No notifications yet"}
                    subtitle={
                      searchValue
                        ? `Nothing matches "${searchValue}"`
                        : side === "seller"
                          ? "Orders, payouts and store updates will appear here."
                          : "Updates about your orders and account will appear here."
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
