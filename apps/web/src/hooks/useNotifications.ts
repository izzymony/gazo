import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Client } from '@/lib/client';
import useAuthStore from '@/store/authStore';

/**
 * Mailbox B (NS2 notification system). The backend serialises
 * domain.Notification with PascalCase names for its custom fields (no json
 * tags) and snake_case for the embedded Model fields — hence the mixed casing
 * below. GET /notification/get-notifications returns { notifications: [...] }.
 */
interface NotificationDTO {
  id: string;
  created_at?: string;
  Title?: string;
  Message?: string;
  ActionURL?: string;
  IsRead?: boolean;
  Type?: string; // "order" | "promo" | "system_alert"
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  actionUrl: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export type NotificationAudience = 'buyer' | 'seller';

const mapNotification = (n: NotificationDTO): AppNotification => ({
  id: n.id,
  title: n.Title ?? '',
  message: n.Message ?? '',
  actionUrl: n.ActionURL ?? '',
  isRead: !!n.IsRead,
  type: n.Type ?? 'system_alert',
  createdAt: n.created_at ?? new Date().toISOString(),
});

const LIST_KEY = ['notifications', 'list'] as const;

/**
 * The user's notification feed for one side. The server filters by the
 * authoritative `audience` field (set from the event-key prefix), so buyer and
 * seller feeds never braid.
 */
export const useNotifications = (audience?: NotificationAudience) => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [...LIST_KEY, audience ?? 'all'],
    enabled: !!user,
    queryFn: async () => {
      const res = await Client<{ notifications?: NotificationDTO[] }>({
        path: '/notification/get-notifications',
        method: 'GET',
        queryParams: { page: 1, limit: 50, ...(audience ? { audience } : {}) },
      });
      const list = res.data?.notifications ?? [];
      return list.map(mapNotification);
    },
  });
};

/** Optimistically flip a notification to read (across every cached feed), then persist. */
export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      Client({ path: `/notification/mark-notification-read/${id}`, method: 'PATCH' }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: LIST_KEY });
      const snapshots = qc.getQueriesData<AppNotification[]>({ queryKey: LIST_KEY });
      qc.setQueriesData<AppNotification[]>({ queryKey: LIST_KEY }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return { snapshots };
    },
    onError: (_e, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('notificationMarkedAsRead'));
      }
    },
  });
};
