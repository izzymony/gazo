import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Client } from '@/lib/client';
import useAuthStore from '@/store/authStore';

interface UseNotificationCountReturn {
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Unread-notification count for the bell badge. Reads the real Mailbox B
 * summary (GET /notification/unread-summary → { unread_notifications }) instead
 * of counting activity-log rows. The `notificationMarkedAsRead` event triggers
 * an immediate refetch so the badge clears as soon as a notification is read.
 */
export const useNotificationCount = (
  audience?: 'buyer' | 'seller',
  refreshInterval: number = 30000,
): UseNotificationCountReturn => {
  const { user } = useAuthStore();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', 'unread', audience ?? 'all'],
    enabled: !!user,
    refetchInterval: refreshInterval,
    queryFn: async () => {
      const res = await Client<{ unread_notifications?: number }>({
        path: '/notification/unread-summary',
        method: 'GET',
        queryParams: audience ? { audience } : {},
      });
      return res.data?.unread_notifications ?? 0;
    },
  });

  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener('notificationMarkedAsRead', handler);
    return () => window.removeEventListener('notificationMarkedAsRead', handler);
  }, [refetch]);

  return {
    unreadCount: data ?? 0,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch notifications') : null,
    refetch,
  };
};
