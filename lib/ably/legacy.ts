// Phase 2: Mapped legacy realtime exports onto the typed Ably contract to eliminate split protocols.
/**
 * Legacy Ably exports preserved for the existing dashboard-scoped realtime system.
 * Phase 8 will migrate callers from these uppercase exports to the new typed catalogue and hooks.
 */

import Ably from 'ably';

import { logger } from '@/lib/logger';

import type { PublishData } from './legacy.types';
import { publishToChannel as publishToRealtimeChannel } from './publisher';

export { CHANNELS, EVENTS, PRIORITY } from './legacy.constants';
export { ChannelManager } from './legacy.manager';
export { cleanupClientAbly, getClientAbly, getServerAbly } from './legacy.server';
export type {
  AblyAnyClient,
  AblyChannel,
  AblyRealtime,
  AblyRest,
  ChannelMessage,
  MessageCallback,
  PresenceCallback,
  PresenceData,
  PresenceMessage,
  PublishData,
} from './legacy.types';

export async function publishToLegacyChannel(
  channelName: string,
  eventName: string,
  data: PublishData
): Promise<boolean> {
  try {
    await publishToRealtimeChannel(channelName, eventName, {
      ...data,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    });
    return true;
  } catch (error: unknown) {
    logger.error('Error publishing to legacy channel:', error);
    return false;
  }
}

export { Ably };
