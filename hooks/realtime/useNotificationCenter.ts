'use client';

import { useCallback, useState } from 'react';

import { useAbly } from '@/contexts/AblyContext';
import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import { useNotificationStore } from '@/lib/stores/notificationStore';

import type { NotificationItem } from './types';
import { getErrorMessage, parseApiResult } from './utils';

export function useRealTimeNotifications() {
  const { currentUser } = useAbly();
  const notifications = useNotificationStore((state) => state.notifications as NotificationItem[]);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const clearNotification = useNotificationStore((state) => state.removeNotification);
  const clearAllNotifications = useNotificationStore((state) => state.setNotifications);
  const markNotificationAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllNotificationsAsRead = useNotificationStore((state) => state.markAllAsRead);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = typeof currentUser?.id === 'string' ? currentUser.id : undefined;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!currentUserId) {
        return false;
      }

      try {
        setError(null);
        const response = await fetchWithCsrf('/api/user/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId }),
        });
        const result = await parseApiResult(response);

        if (!response.ok || !result.success) {
          setError(result.message || result.error || 'Failed to mark notification as read');
          return false;
        }

        markNotificationAsRead(notificationId);
        return true;
      } catch (error) {
        setError(getErrorMessage(error));
        return false;
      }
    },
    [currentUserId, markNotificationAsRead]
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) {
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      const result = await parseApiResult(response);

      if (!response.ok || !result.success) {
        setError(result.message || result.error || 'Failed to mark all notifications as read');
        return false;
      }

      markAllNotificationsAsRead();
      return true;
    } catch (error) {
      setError(getErrorMessage(error));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, markAllNotificationsAsRead]);

  const notificationList = notifications;

  const getNotificationsByType = useCallback(
    (type: string) => notificationList.filter((item) => item.type === type),
    [notificationList]
  );

  const getRecentNotifications = useCallback(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notificationList.filter((item) => {
      if (!item.timestamp) {
        return false;
      }
      return new Date(item.timestamp) > yesterday;
    });
  }, [notificationList]);

  return {
    notifications: notificationList,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications: () => clearAllNotifications([]),
    getNotificationsByType,
    getRecentNotifications,
  };
}
