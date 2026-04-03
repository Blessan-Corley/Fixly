'use client';

import Ably from 'ably';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { getAblyClient } from '@/lib/ably/client';

type MessageHandler = (message: Ably.Message) => void;

/**
 * Subscribe to all messages on an Ably channel.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Safe to use in any component — handles session state internally.
 *
 * @param channelName - Use Channels.user(id), Channels.job(id), etc. Never raw strings.
 * @param onMessage - Handler called for every message on the channel
 * @param enabled - Set to false to disable subscription (useful for conditional subscriptions)
 */
export function useAblyChannel(channelName: string, onMessage: MessageHandler, enabled = true): void {
  const { status } = useSession();
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const handlerRef = useRef<MessageHandler>(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (status !== 'authenticated' || !enabled || !channelName) {
      return;
    }

    const client = getAblyClient();
    const channel = client.channels.get(channelName);
    channelRef.current = channel;

    const handler = (message: Ably.Message): void => {
      handlerRef.current(message);
    };

    channel.subscribe(handler);

    return () => {
      channel.unsubscribe(handler);
      channelRef.current = null;
    };
  }, [channelName, enabled, status]);
}
