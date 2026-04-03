'use client';

import type { ChannelMessage, NotificationItem } from './types';

export const isInvalidChannelName = (channelName: string | null | undefined): boolean => {
  if (!channelName) {
    return true;
  }

  return (
    channelName.includes('null') ||
    channelName.includes('undefined') ||
    channelName.includes(':null:') ||
    channelName.includes(':undefined:') ||
    channelName.endsWith(':null') ||
    channelName.endsWith(':undefined')
  );
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const resolveTimestamp = (...values: unknown[]): string => {
  for (const value of values) {
    const candidate = asTrimmedString(value);
    if (!candidate) {
      continue;
    }

    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

export const getNotificationIdentity = (notification: NotificationItem): string =>
  `${notification.id}:${notification.type}:${notification.timestamp}`;

export const getNotificationFromMessage = (message: ChannelMessage): NotificationItem | null => {
  const data = message.data;
  if (!isRecord(data)) {
    return null;
  }

  const nestedData = isRecord(data.data) ? data.data : undefined;
  const timestamp = resolveTimestamp(data.createdAt, data.timestamp);
  const type = asTrimmedString(data.type) || 'system';
  const id =
    asTrimmedString(data.id) ||
    asTrimmedString(data.messageId) ||
    asTrimmedString(data._id) ||
    `notif_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const title = asTrimmedString(data.title) || 'Fixly Notification';
  const messageText =
    asTrimmedString(data.message) ||
    asTrimmedString(data.body) ||
    asTrimmedString(nestedData?.message) ||
    'You have a new notification.';
  const actionUrl =
    asTrimmedString(data.actionUrl) || asTrimmedString(nestedData?.url) || undefined;

  return {
    id,
    messageId: asTrimmedString(data.messageId) || undefined,
    title,
    message: messageText,
    body: asTrimmedString(data.body) || undefined,
    read: data.read === true,
    readAt: asTrimmedString(data.readAt) || undefined,
    type,
    timestamp,
    createdAt: resolveTimestamp(data.createdAt, data.timestamp, timestamp),
    actionUrl,
    data: nestedData,
  };
};
