'use client';

import { useCallback } from 'react';

import { getAblyClient } from '@/lib/ably/client';

/**
 * Returns a publish function for sending events to an Ably channel.
 * Use for client-to-client events (typing indicators, read receipts).
 * For server-triggered events (notifications, status changes), publish from API routes.
 *
 * @param channelName - Use Channels.* constants. Never raw strings.
 */
export function useAblyPublish(channelName: string): {
  publish: (eventName: string, data: unknown) => Promise<void>;
} {
  const publish = useCallback(
    async (eventName: string, data: unknown): Promise<void> => {
      try {
        const client = getAblyClient();
        const channel = client.channels.get(channelName);
        await channel.publish(eventName, data);
      } catch (error) {
        console.error(`[Ably] Failed to publish ${eventName} on ${channelName}:`, error);
      }
    },
    [channelName]
  );

  return { publish };
}
