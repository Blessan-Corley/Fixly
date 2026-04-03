// Phase 2: Moved notification subscriptions onto the typed Ably channel and event catalogue.
'use client';

import { useEffect } from 'react';

import { Channels, Events } from '@/lib/ably/events';

import { getNotificationFromMessage, getNotificationIdentity } from './notification-utils';
import type { ChannelManagerInstance, CleanupFn, NotificationItem } from './types';

type UseNotificationSubscriptionsParams = {
  refreshConversationAuth: () => Promise<void>;
  userId?: string;
  channelManager: ChannelManagerInstance | null;
  connectionStatus: string;
  cleanupRef: React.MutableRefObject<CleanupFn[]>;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
};

function pushBrowserNotification(notification: NotificationItem): void {
  if (typeof window === 'undefined') {
    return;
  }

  const bodyText = notification.message;
  const messageTag = notification.id;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title || 'Fixly Notification', {
      body: bodyText,
      icon: '/favicon.ico',
      tag: messageTag,
    });
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title: notification.title || 'Fixly Notification',
        body: bodyText,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: messageTag,
      },
    });
  }
}

export function useNotificationSubscriptions({
  refreshConversationAuth,
  userId,
  channelManager,
  connectionStatus,
  cleanupRef,
  setNotifications,
}: UseNotificationSubscriptionsParams): void {
  useEffect(() => {
    if (!userId || !channelManager || connectionStatus !== 'connected') {
      return;
    }

    let isSubscriptionActive = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: CleanupFn | undefined;

    const subscribeToNotifications = async () => {
      if (!isSubscriptionActive) {
        return;
      }

      try {
        unsubscribe = await channelManager.subscribeToChannel(
          Channels.user(userId),
          Events.user.notificationSent,
          (message) => {
            if (!isSubscriptionActive) {
              return;
            }

            const payload = getNotificationFromMessage(message);
            if (!payload) {
              return;
            }

            setNotifications((prev) => {
              const existingIndex = prev.findIndex((item) => item.id === payload.id);
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = { ...next[existingIndex], ...payload };
                return next;
              }

              const identity = getNotificationIdentity(payload);
              if (prev.some((item) => getNotificationIdentity(item) === identity)) {
                return prev;
              }

              return [payload, ...prev].slice(0, 50);
            });

            pushBrowserNotification(payload);
          }
        );

        if (isSubscriptionActive && unsubscribe) {
          cleanupRef.current.push(unsubscribe);
        }
      } catch (error) {
        console.error('Failed to subscribe to notifications:', error);
      }
    };

    timeoutId = setTimeout(subscribeToNotifications, 500);

    return () => {
      isSubscriptionActive = false;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      try {
        if (unsubscribe) {
          cleanupRef.current = cleanupRef.current.filter((entry) => entry !== unsubscribe);
        }
        unsubscribe?.();
      } catch (error) {
        console.error('Error unsubscribing from notifications:', error);
      }
    };
  }, [channelManager, cleanupRef, connectionStatus, setNotifications, userId]);

  useEffect(() => {
    if (!userId || !channelManager || connectionStatus !== 'connected') {
      return;
    }

    let isSubscriptionActive = true;
    let unsubscribe: CleanupFn | undefined;

    const subscribeToReadEvents = async () => {
      try {
        unsubscribe = await channelManager.subscribeToChannel(
          Channels.user(userId),
          Events.user.notificationRead,
          (message) => {
            if (
              !isSubscriptionActive ||
              !message.data ||
              typeof message.data !== 'object' ||
              Array.isArray(message.data)
            ) {
              return;
            }

            const payload = message.data as {
              notificationIds?: unknown[];
              markAll?: boolean;
              timestamp?: string;
            };

            const notificationIds = Array.isArray(payload.notificationIds)
              ? payload.notificationIds.filter(
                  (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
                )
              : [];
            const markAll = payload.markAll === true;
            const readAt =
              payload.timestamp && !Number.isNaN(new Date(payload.timestamp).getTime())
                ? new Date(payload.timestamp).toISOString()
                : new Date().toISOString();

            setNotifications((prev) =>
              prev.map((notification) => {
                if (markAll || notificationIds.includes(notification.id)) {
                  return {
                    ...notification,
                    read: true,
                    readAt: notification.readAt || readAt,
                  };
                }

                return notification;
              })
            );
          }
        );

        if (isSubscriptionActive && unsubscribe) {
          cleanupRef.current.push(unsubscribe);
        }
      } catch (error) {
        console.error('Failed to subscribe to notification read events:', error);
      }
    };

    void subscribeToReadEvents();

    return () => {
      isSubscriptionActive = false;

      try {
        if (unsubscribe) {
          cleanupRef.current = cleanupRef.current.filter((entry) => entry !== unsubscribe);
        }
        unsubscribe?.();
      } catch (error) {
        console.error('Error unsubscribing from notification read events:', error);
      }
    };
  }, [channelManager, cleanupRef, connectionStatus, setNotifications, userId]);

  useEffect(() => {
    if (!userId || !channelManager || connectionStatus !== 'connected') {
      return;
    }

    let isSubscriptionActive = true;
    const unsubscribers: CleanupFn[] = [];

    const subscribeToConversationEvents = async (): Promise<void> => {
      const eventNames = [Events.user.conversationCreated, Events.user.messageNotification] as const;

      for (const eventName of eventNames) {
        const unsubscribe = await channelManager.subscribeToChannel(
          Channels.user(userId),
          eventName,
          (message) => {
            if (
              !isSubscriptionActive ||
              !message.data ||
              typeof message.data !== 'object' ||
              Array.isArray(message.data)
            ) {
              return;
            }

            const payload = message.data as { conversationId?: unknown };
            if (typeof payload.conversationId === 'string' && payload.conversationId.trim()) {
              void refreshConversationAuth();
            }
          }
        );

        unsubscribers.push(unsubscribe);
        cleanupRef.current.push(unsubscribe);
      }
    };

    void subscribeToConversationEvents();

    return () => {
      isSubscriptionActive = false;

      unsubscribers.forEach((unsubscribe) => {
        try {
          cleanupRef.current = cleanupRef.current.filter((entry) => entry !== unsubscribe);
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from conversation capability events:', error);
        }
      });
    };
  }, [channelManager, cleanupRef, connectionStatus, refreshConversationAuth, userId]);
}
