import { logger } from '@/lib/logger';

import type {
  AblyAnyClient,
  AblyChannel,
  MessageCallback,
  PresenceCallback,
  PresenceData,
  PublishData,
} from './legacy.types';

export class ChannelManager {
  private ably: AblyAnyClient;
  private activeChannels: Map<string, AblyChannel>;

  constructor(ably: AblyAnyClient) {
    this.ably = ably;
    this.activeChannels = new Map();
  }

  getChannel(channelName: string): AblyChannel {
    if (!this.activeChannels.has(channelName)) {
      const channel = this.ably.channels.get(channelName) as AblyChannel;
      this.activeChannels.set(channelName, channel);
    }
    return this.activeChannels.get(channelName) as AblyChannel;
  }

  async subscribeToChannel(
    channelName: string,
    eventName: string,
    callback: MessageCallback
  ): Promise<() => void> {
    const channel = this.getChannel(channelName);
    if (!channel.subscribe) {
      throw new Error('Subscribe is only available on Realtime channels');
    }

    const subscribeWithRetry = async (retryCount = 0): Promise<void> => {
      try {
        await channel.subscribe?.(eventName, callback);
      } catch (error: unknown) {
        logger.error(`Subscription failed for ${channelName}:${eventName}`, error);
        if (retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000));
          return subscribeWithRetry(retryCount + 1);
        }
        throw error;
      }
    };

    await subscribeWithRetry();

    return () => {
      try {
        channel.unsubscribe?.(eventName, callback);
      } catch (error: unknown) {
        logger.error(`Error unsubscribing from ${channelName}:${eventName}`, error);
      }
    };
  }

  async publishToChannel(
    channelName: string,
    eventName: string,
    data: PublishData,
    extras: Record<string, unknown> = {}
  ): Promise<unknown> {
    const payload = {
      ...data,
      ...extras,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };
    const channel = this.getChannel(channelName);
    return channel.publish(eventName, payload);
  }

  async enterPresence(channelName: string, userData: PresenceData): Promise<unknown> {
    const channel = this.getChannel(channelName);
    if (!channel.presence?.enter) {
      throw new Error('Presence enter is unavailable on this channel/client');
    }
    return channel.presence.enter(userData);
  }

  async leavePresence(channelName: string, userData: PresenceData = {}): Promise<unknown> {
    const channel = this.getChannel(channelName);
    if (!channel.presence?.leave) {
      throw new Error('Presence leave is unavailable on this channel/client');
    }
    return channel.presence.leave(userData);
  }

  async updatePresence(channelName: string, userData: PresenceData): Promise<unknown> {
    const channel = this.getChannel(channelName);
    if (!channel.presence?.update) {
      throw new Error('Presence update is unavailable on this channel/client');
    }
    return channel.presence.update(userData);
  }

  async getPresenceMembers(channelName: string): Promise<unknown> {
    const channel = this.getChannel(channelName);
    if (!channel.presence?.get) {
      throw new Error('Presence get is unavailable on this channel/client');
    }
    return channel.presence.get();
  }

  async subscribeToPresence(
    channelName: string,
    callback: PresenceCallback,
    action?: string
  ): Promise<() => void> {
    const channel = this.getChannel(channelName);
    if (!channel.presence?.subscribe || !channel.presence?.unsubscribe) {
      throw new Error('Presence subscribe is unavailable on this channel/client');
    }
    const presence = channel.presence;

    const subscribeWithRetry = async (retryCount = 0): Promise<void> => {
      try {
        if (action) {
          await (
            presence.subscribe as (
              action: string,
              subscribeCallback: PresenceCallback
            ) => Promise<void>
          )(action, callback);
        } else {
          await (presence.subscribe as (subscribeCallback: PresenceCallback) => Promise<void>)(
            callback
          );
        }
      } catch (error: unknown) {
        logger.error(
          `Presence subscription failed for ${channelName}${action ? `:${action}` : ''}`,
          error
        );
        if (retryCount < 3) {
          await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000));
          return subscribeWithRetry(retryCount + 1);
        }
        throw error;
      }
    };

    await subscribeWithRetry();

    return () => {
      try {
        if (action) {
          (
            presence.unsubscribe as
              | ((unsubscribeAction?: string, unsubscribeCallback?: PresenceCallback) => void)
              | undefined
          )?.(action, callback);
        } else {
          (
            presence.unsubscribe as ((unsubscribeCallback?: PresenceCallback) => void) | undefined
          )?.(callback);
        }
      } catch (error: unknown) {
        logger.error(
          `Error unsubscribing from presence ${channelName}${action ? `:${action}` : ''}`,
          error
        );
      }
    };
  }

  cleanup(): void {
    this.activeChannels.forEach((channel, channelName) => {
      try {
        channel.off?.();
        void channel.presence?.leave?.().catch((error: unknown) => {
          logger.warn(`Could not leave presence for ${channelName}:`, error);
        });
        channel.detach?.();
      } catch (error: unknown) {
        logger.error(`Error cleaning up channel ${channelName}:`, error);
      }
    });
    this.activeChannels.clear();
  }
}
