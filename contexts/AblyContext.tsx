'use client';

import { useSession } from 'next-auth/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from 'react';

import { useAblyConnection } from '@/hooks/useAblyConnection';
import { ChannelManager, CHANNELS, EVENTS } from '@/lib/ably';
import { useNotificationStore } from '@/lib/stores/notificationStore';

import { AblyContext, useAbly } from './ably/context';
import { useAblyCallbacks } from './ably/useAblyCallbacks';
import type { AblyContextValue, ChannelManagerInstance, CleanupFn } from './ably/types';
import { useNotificationSubscriptions } from './ably/useNotificationSubscriptions';

export { useAbly } from './ably/context';
export { useAblyChannel, useAblyPresence } from './ably/useAblyHooks';

type AblyProviderProps = {
  children: ReactNode;
};

export function AblyProvider({ children }: AblyProviderProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const cleanupRef = useRef<CleanupFn[]>([]);
  const [channelManager, setChannelManager] = useState<ChannelManagerInstance | null>(null);

  const notifications = useNotificationStore(
    (state) => state.notifications as AblyContextValue['notifications']
  );
  const setNotificationsInStore = useNotificationStore((state) => state.setNotifications);
  const removeNotificationFromStore = useNotificationStore((state) => state.removeNotification);
  const markNotificationAsReadInStore = useNotificationStore((state) => state.markAsRead);
  const markAllNotificationsAsReadInStore = useNotificationStore((state) => state.markAllAsRead);

  const { ably, connectionStatus, isConnected, reconnect, healthCheck } = useAblyConnection();

  const setNotifications = useCallback(
    (updater: SetStateAction<AblyContextValue['notifications']>): void => {
      const current = useNotificationStore.getState().notifications as AblyContextValue['notifications'];
      const next = typeof updater === 'function' ? updater(current) : updater;
      setNotificationsInStore(next);
    },
    [setNotificationsInStore]
  );

  const registerCleanup = useCallback((cleanup: CleanupFn): void => {
    cleanupRef.current.push(cleanup);
  }, []);

  const unregisterCleanup = useCallback((cleanup: CleanupFn): void => {
    cleanupRef.current = cleanupRef.current.filter((entry) => entry !== cleanup);
  }, []);

  const refreshConversationAuth = useCallback(async (): Promise<void> => {
    if (!ably?.auth?.authorize) return;
    try {
      await ably.auth.authorize();
    } catch (error) {
      console.error('Failed to refresh Ably auth token:', error);
    }
  }, [ably]);

  useEffect(() => {
    if (!ably || connectionStatus === 'disabled') return;

    if (userId && ably.auth?.clientId !== userId) {
      ably.auth.clientId = userId;
    }

    const manager = new ChannelManager(ably);
    setChannelManager(manager);

    return () => {
      const currentCleanups = [...cleanupRef.current];
      cleanupRef.current = [];

      Promise.allSettled(
        currentCleanups.map((cleanup) => Promise.resolve().then(() => { cleanup(); }))
      ).catch((error) => { console.error('Error during cleanup:', error); });

      try {
        manager.cleanup();
      } catch (error) {
        console.error('Error during channel manager cleanup:', error);
      }
    };
  }, [ably, connectionStatus, userId]);

  useNotificationSubscriptions({
    refreshConversationAuth,
    userId,
    channelManager,
    connectionStatus,
    cleanupRef,
    setNotifications,
  });

  useEffect(() => {
    setNotificationsInStore([]);
  }, [setNotificationsInStore, userId]);

  const {
    publishMessage,
    subscribeToChannel,
    subscribeToPresence,
    enterPresence,
    leavePresence,
    getPresenceMembers,
  } = useAblyCallbacks({
    channelManager,
    sessionUser: session?.user ?? null,
    setConnectionError,
    registerCleanup,
    unregisterCleanup,
  });

  const clearNotification = useCallback((messageId: string): void => {
    removeNotificationFromStore(messageId);
  }, [removeNotificationFromStore]);

  const clearAllNotifications = useCallback((): void => {
    setNotificationsInStore([]);
  }, [setNotificationsInStore]);

  const markNotificationAsRead = useCallback((notificationId: string): void => {
    markNotificationAsReadInStore(notificationId);
  }, [markNotificationAsReadInStore]);

  const markAllNotificationsAsRead = useCallback((): void => {
    markAllNotificationsAsReadInStore();
  }, [markAllNotificationsAsReadInStore]);

  const contextValue = useMemo<AblyContextValue>(
    () => ({
      ably,
      channelManager,
      connectionStatus,
      isConnected,
      reconnect,
      healthCheck,
      connectionError,
      notifications,
      clearNotification,
      clearAllNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      publishMessage,
      subscribeToChannel,
      subscribeToPresence,
      enterPresence,
      leavePresence,
      getPresenceMembers,
      CHANNELS,
      EVENTS,
      currentUser: session?.user ?? null,
    }),
    [
      ably,
      channelManager,
      connectionStatus,
      isConnected,
      reconnect,
      healthCheck,
      connectionError,
      notifications,
      clearNotification,
      clearAllNotifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      publishMessage,
      subscribeToChannel,
      subscribeToPresence,
      enterPresence,
      leavePresence,
      getPresenceMembers,
      session?.user,
    ]
  );

  return <AblyContext.Provider value={contextValue}>{children}</AblyContext.Provider>;
}
