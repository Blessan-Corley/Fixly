// Phase 2: Repointed notification queries and mutations at the real user notification API.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore, type Notification } from '@/lib/stores/notificationStore';

import { queryKeys } from './keys';
import {
  extractErrorMessage,
  fetchNotifications,
  hasActiveFilters,
  readJson,
  type Filters,
  type NotificationsResponse,
} from './notifications.helpers';

export type { Filters, NotificationsResponse };

export function useNotifications(filters: Filters = {}) {
  const setNotifications = useNotificationStore((state) => state.setNotifications);

  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const result = await fetchNotifications(filters);
      if (!hasActiveFilters(filters) && Array.isArray(result.notifications)) {
        setNotifications(result.notifications as Notification[]);
      }
      return result;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export const useNotificationsQuery = useNotifications;

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/user/notifications/${notificationId}`, { method: 'PATCH' });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(extractErrorMessage(payload, 'Failed to mark notification read'));
      return payload;
    },
    onMutate: async (notificationId) => {
      markAsRead(notificationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export const useMarkAsReadMutation = useMarkNotificationRead;

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/notifications/read-all', { method: 'PATCH' });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(extractErrorMessage(payload, 'Failed to mark all notifications read'));
      return payload;
    },
    onMutate: async () => {
      markAllAsRead();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export const useMarkAllAsReadMutation = useMarkAllNotificationsRead;

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/user/notifications/${notificationId}`, { method: 'DELETE' });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(extractErrorMessage(payload, 'Failed to delete notification'));
      return payload;
    },
    onMutate: async (notificationId) => {
      removeNotification(notificationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
