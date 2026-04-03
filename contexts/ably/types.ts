'use client';

import type { useAblyConnection } from '@/hooks/useAblyConnection';
import type { ChannelManager, CHANNELS, EVENTS } from '@/lib/ably';

export type CleanupFn = () => void;
export type ChannelMessage = { data: unknown };
export type ChannelCallback = (message: ChannelMessage) => void;

export type PresenceMessage = {
  clientId?: string;
  action?: string;
  data?: unknown;
};

export type PresenceCallback = (message: PresenceMessage) => void;

export type NotificationItem = {
  id: string;
  messageId?: string;
  title: string;
  message: string;
  body?: string;
  read: boolean;
  readAt?: string;
  type: string;
  timestamp: string;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
};

export type CurrentUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  [key: string]: unknown;
} | null;

export type ChannelManagerInstance = InstanceType<typeof ChannelManager>;

export type AblyContextValue = {
  ably: ReturnType<typeof useAblyConnection>['ably'];
  channelManager: ChannelManagerInstance | null;
  connectionStatus: ReturnType<typeof useAblyConnection>['connectionStatus'];
  isConnected: boolean;
  reconnect: () => void;
  healthCheck: () => boolean;
  connectionError: string | null;
  notifications: NotificationItem[];
  clearNotification: (messageId: string) => void;
  clearAllNotifications: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
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
  CHANNELS: typeof CHANNELS;
  EVENTS: typeof EVENTS;
  currentUser: CurrentUser;
};
