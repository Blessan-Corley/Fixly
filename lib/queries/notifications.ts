// Phase 2: Repointed notification queries and mutations at the real user notification API.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useNotificationStore, type Notification } from '@/lib/stores/notificationStore';

import { queryKeys } from './keys';

type Filters = Record<string, unknown>;
type NotificationsResponse = {
  data?: {
    notifications?: Notification[];
    unreadCount?: number;
  };
  message?: string;
  error?: string;
  notifications?: Notification[];
  pagination?: Record<string, unknown>;
  unreadCount?: number;
  [key: string]: unknown;
};

function toSearchParams(filters: Filters = {}): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchNotifications(filters: Filters = {}): Promise<NotificationsResponse> {
  const params = toSearchParams(filters);
  const response = await fetch(`/api/user/notifications?${params.toString()}`);
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
        : 'Failed to fetch notifications';
    throw new Error(message);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }

  const normalizedPayload = payload as NotificationsResponse;
  if (normalizedPayload.data && typeof normalizedPayload.data === 'object') {
    return {
      notifications: normalizedPayload.data.notifications,
      unreadCount: normalizedPayload.data.unreadCount,
      pagination: normalizedPayload.pagination,
      message: normalizedPayload.message,
    };
  }

  return normalizedPayload;
}

function hasActiveFilters(filters: Filters): boolean {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== undefined && value !== null && value !== '' && value !== 'all';
  });
}

export function useNotifications(filters: Filters = {}) {
  const setNotifications = useNotificationStore((state) => state.setNotifications);

  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: async () => {
      const result = await fetchNotifications(filters);
      if (!hasActiveFilters(filters) && Array.isArray(result.notifications)) {
        setNotifications(result.notifications);
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
      const response = await fetch(`/api/user/notifications/${notificationId}`, {
        method: 'PATCH',
      });
      const payload = await readJson(response);
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string'
            ? payload.message
            : payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
              ? payload.error
              : 'Failed to mark notification read';
        throw new Error(message);
      }

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
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string'
            ? payload.message
            : payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
              ? payload.error
            : 'Failed to mark all notifications read';
        throw new Error(message);
      }

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
      const response = await fetch(`/api/user/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      const payload = await readJson(response);

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof payload.message === 'string'
            ? payload.message
            : payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
              ? payload.error
            : 'Failed to delete notification';
        throw new Error(message);
      }

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
