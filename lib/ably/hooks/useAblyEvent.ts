'use client';

import Ably from 'ably';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { getAblyClient } from '@/lib/ably/client';

type MessageHandler = (message: Ably.Message) => void;

/**
 * Subscribe to a specific named event on an Ably channel.
 * More efficient than useAblyChannel when you only care about one event type.
 *
 * @param channelName - Use Channels.* constants. Never raw strings.
 * @param eventName - Use Events.* constants. Never raw strings.
 * @param onEvent - Handler called when this specific event arrives
 * @param enabled - Set to false to disable (useful for conditional subscriptions)
 */
export function useAblyEvent(
  channelName: string,
  eventName: string,
  onEvent: MessageHandler,
  enabled = true
): void {
  const { status } = useSession();
  const handlerRef = useRef<MessageHandler>(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (status !== 'authenticated' || !enabled || !channelName || !eventName) {
      return;
    }

    const client = getAblyClient();
    const channel = client.channels.get(channelName);
    const handler = (message: Ably.Message): void => {
      handlerRef.current(message);
    };

    channel.subscribe(eventName, handler);

    return () => {
      channel.unsubscribe(eventName, handler);
    };
  }, [channelName, eventName, enabled, status]);
}
