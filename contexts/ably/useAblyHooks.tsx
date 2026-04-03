'use client';

import { useEffect, useRef, useState } from 'react';

import { isInvalidChannelName } from './notification-utils';
import type { ChannelCallback, CleanupFn } from './types';
import { useAbly } from './context';

export function useAblyChannel(
  channelName: string | null | undefined,
  eventName: string | null | undefined,
  callback: ChannelCallback,
  dependencies: readonly unknown[] = []
): void {
  const { subscribeToChannel } = useAbly();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!channelName || !eventName || isInvalidChannelName(channelName)) {
      return;
    }

    let unsubscribe: CleanupFn | undefined;

    const wrappedCallback: ChannelCallback = (message) => {
      callbackRef.current(message);
    };

    const subscribe = async (): Promise<void> => {
      unsubscribe = await subscribeToChannel(channelName, eventName, wrappedCallback);
    };

    subscribe().catch((error) => {
      console.warn('Channel subscription failed:', error);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        console.warn('Error during channel cleanup:', error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, eventName, subscribeToChannel, ...dependencies]);
}

export function useAblyPresence(
  channelName: string | null | undefined,
  userData: Record<string, unknown> = {},
  shouldEnter = true
): unknown[] {
  const { enterPresence, leavePresence, getPresenceMembers } = useAbly();
  const [presenceMembers, setPresenceMembers] = useState<unknown[]>([]);

  useEffect(() => {
    if (!channelName || !shouldEnter) {
      return;
    }

    const handlePresence = async (): Promise<void> => {
      await enterPresence(channelName, userData);
      const members = await getPresenceMembers(channelName);
      setPresenceMembers(members);
    };

    handlePresence().catch((error) => {
      console.error('Presence setup failed:', error);
    });

    return () => {
      leavePresence(channelName).catch((error) => {
        console.error('Presence cleanup failed:', error);
      });
    };
  }, [channelName, shouldEnter, enterPresence, leavePresence, getPresenceMembers, userData]);

  return presenceMembers;
}
