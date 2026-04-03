// Phase 2: Ensured Ably publishing failures degrade safely without breaking successful mutations.
import Ably from 'ably';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

let restClient: Ably.Rest | null = null;

/**
 * Singleton Ably REST client for server-side publishing.
 * Use this in API routes and Inngest functions.
 * Never use the Realtime client server-side — REST is correct for publishing only.
 */
function getAblyRestClient(): Ably.Rest {
  if (!restClient) {
    if (!env.ABLY_API_KEY) {
      throw new Error('[Ably Publisher] ABLY_API_KEY is not set');
    }

    restClient = new Ably.Rest({ key: env.ABLY_API_KEY ?? '' });
  }

  return restClient;
}

/**
 * Publish an event to an Ably channel from the server.
 * Use Channels.* for channelName and Events.* for eventName.
 *
 * @param channelName - Use Channels.user(id), Channels.job(id), etc.
 * @param eventName - Use Events.user.notificationSent etc.
 * @param data - Event payload (must match the corresponding payload type)
 */
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown
): Promise<void> {
  try {
    const client = getAblyRestClient();
    const channel = client.channels.get(channelName);
    await channel.publish(eventName, data);
  } catch (error) {
    logger.error({ error, eventName, channelName }, '[Ably Publisher] Failed to publish event');
  }
}

/**
 * Publish to multiple channels simultaneously.
 * Use for fanout (e.g., notify multiple users at once).
 */
export async function publishToChannels(
  events: Array<{ channelName: string; eventName: string; data: unknown }>
): Promise<void> {
  await Promise.allSettled(
    events.map(({ channelName, eventName, data }) =>
      publishToChannel(channelName, eventName, data)
    )
  );
}
