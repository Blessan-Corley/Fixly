'use client';

import { useCallback } from 'react';

import { getErrorMessage, isInvalidChannelName } from './notification-utils';
import type { ChannelCallback, ChannelManagerInstance, CleanupFn, PresenceCallback } from './types';

type SessionUser = {
  id?: string;
  name?: string | null;
  image?: string | null;
} | null;

type UseAblyCallbacksOptions = {
  channelManager: ChannelManagerInstance | null;
  sessionUser: SessionUser;
  setConnectionError: (error: string | null) => void;
  registerCleanup: (fn: CleanupFn) => void;
  unregisterCleanup: (fn: CleanupFn) => void;
};

type AblyCallbacks = {
  publishMessage: (
    channelName: string,
    eventName: string,
    data: Record<string, unknown>,
    extras?: Record<string, unknown>
  ) => Promise<boolean>;
  subscribeToChannel: (
    channelName: string,
    eventName: string,
    callback: ChannelCallback
  ) => Promise<CleanupFn>;
  subscribeToPresence: (
    channelName: string,
    callback: PresenceCallback,
    action?: string
  ) => Promise<CleanupFn>;
  enterPresence: (channelName: string, userData?: Record<string, unknown>) => Promise<boolean>;
  leavePresence: (channelName: string) => Promise<boolean>;
  getPresenceMembers: (channelName: string) => Promise<unknown[]>;
};

export function useAblyCallbacks({
  channelManager,
  sessionUser,
  setConnectionError,
  registerCleanup,
  unregisterCleanup,
}: UseAblyCallbacksOptions): AblyCallbacks {
  const publishMessage = useCallback(
    async (
      channelName: string,
      eventName: string,
      data: Record<string, unknown>,
      extras: Record<string, unknown> = {}
    ): Promise<boolean> => {
      if (!channelManager) return false;
      try {
        await channelManager.publishToChannel(channelName, eventName, data, extras);
        return true;
      } catch (error) {
        console.error('Failed to publish message:', error);
        return false;
      }
    },
    [channelManager]
  );

  const subscribeToChannel = useCallback(
    async (
      channelName: string,
      eventName: string,
      callback: ChannelCallback
    ): Promise<CleanupFn> => {
      if (!channelManager || isInvalidChannelName(channelName) || !eventName) return () => {};

      let isMounted = true;
      try {
        const unsubscribe = await channelManager.subscribeToChannel(
          channelName,
          eventName,
          callback
        );
        if (isMounted) registerCleanup(unsubscribe);
        setConnectionError(null);

        return () => {
          isMounted = false;
          unregisterCleanup(unsubscribe);
          unsubscribe();
        };
      } catch (error) {
        const message = getErrorMessage(error);
        setConnectionError(`Failed to subscribe to ${channelName}: ${message}`);
        return () => {};
      }
    },
    [channelManager, registerCleanup, unregisterCleanup, setConnectionError]
  );

  const enterPresence = useCallback(
    async (channelName: string, userData: Record<string, unknown> = {}): Promise<boolean> => {
      if (!channelManager) return false;
      try {
        await channelManager.enterPresence(channelName, {
          userId: sessionUser?.id,
          userName: sessionUser?.name,
          userAvatar: sessionUser?.image,
          ...userData,
        });
        return true;
      } catch (error) {
        console.error('Failed to enter presence:', error);
        return false;
      }
    },
    [channelManager, sessionUser?.id, sessionUser?.image, sessionUser?.name]
  );

  const subscribeToPresence = useCallback(
    async (
      channelName: string,
      callback: PresenceCallback,
      action?: string
    ): Promise<CleanupFn> => {
      if (!channelManager || isInvalidChannelName(channelName)) return () => {};

      let isMounted = true;
      try {
        const unsubscribe = await channelManager.subscribeToPresence(channelName, callback, action);
        if (isMounted) registerCleanup(unsubscribe);
        setConnectionError(null);

        return () => {
          isMounted = false;
          unregisterCleanup(unsubscribe);
          unsubscribe();
        };
      } catch (error) {
        const message = getErrorMessage(error);
        setConnectionError(`Failed to subscribe to presence on ${channelName}: ${message}`);
        return () => {};
      }
    },
    [channelManager, registerCleanup, unregisterCleanup, setConnectionError]
  );

  const leavePresence = useCallback(
    async (channelName: string): Promise<boolean> => {
      if (!channelManager) return false;
      try {
        await channelManager.leavePresence(channelName);
        return true;
      } catch (error) {
        console.error('Failed to leave presence:', error);
        return false;
      }
    },
    [channelManager]
  );

  const getPresenceMembers = useCallback(
    async (channelName: string): Promise<unknown[]> => {
      if (!channelManager) return [];
      try {
        const members = await channelManager.getPresenceMembers(channelName);
        return Array.isArray(members) ? members : [];
      } catch (error) {
        console.error('Failed to get presence members:', error);
        return [];
      }
    },
    [channelManager]
  );

  return {
    publishMessage,
    subscribeToChannel,
    subscribeToPresence,
    enterPresence,
    leavePresence,
    getPresenceMembers,
  };
}
