import type Ably from 'ably';

export type PresenceData = Record<string, unknown>;
export type PublishData = Record<string, unknown>;
export type ChannelMessage = { data: unknown };
export type MessageCallback = (message: ChannelMessage) => void;
export type PresenceMessage = {
  clientId?: string;
  action?: string;
  data?: unknown;
};
export type PresenceCallback = (presenceMessage: PresenceMessage) => void;

export type AblyRest = InstanceType<typeof Ably.Rest>;
export type AblyRealtime = InstanceType<typeof Ably.Realtime>;
export type AblyAnyClient = AblyRealtime | AblyRest;

export type AblyChannel = {
  subscribe?: (eventName: string, callback: MessageCallback) => Promise<void>;
  unsubscribe?: (eventName?: string, callback?: MessageCallback) => void;
  publish: (name: string, data: unknown) => Promise<unknown>;
  presence?: {
    enter?: (data: PresenceData) => Promise<unknown>;
    leave?: (data?: PresenceData) => Promise<unknown>;
    update?: (data: PresenceData) => Promise<unknown>;
    get?: () => Promise<unknown>;
    subscribe?:
      | ((callback: PresenceCallback) => Promise<void>)
      | ((action: string, callback: PresenceCallback) => Promise<void>);
    unsubscribe?:
      | ((callback?: PresenceCallback) => void)
      | ((action?: string, callback?: PresenceCallback) => void);
  };
  detach?: () => void;
  off?: () => void;
};
