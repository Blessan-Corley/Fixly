import webpush from 'web-push';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

type PushAction = {
  action: string;
  title: string;
  icon?: string;
};

export type ServerPushPayload = {
  title: string;
  body: string;
  url?: string;
  notificationId?: string;
  tag?: string;
  urgent?: boolean;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: PushAction[];
};

export type StoredPushSubscription = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  expirationTime?: number | null;
  [key: string]: unknown;
};

let vapidConfigured = false;
let vapidInitialized = false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isValidStoredPushSubscription = (value: unknown): value is StoredPushSubscription => {
  if (!isRecord(value)) return false;
  if (typeof value.endpoint !== 'string' || value.endpoint.trim().length === 0) return false;
  if (!isRecord(value.keys)) return false;
  const keys = value.keys as Record<string, unknown>;
  return typeof keys.auth === 'string' && typeof keys.p256dh === 'string';
};

const ensureVapidConfig = (): boolean => {
  if (vapidInitialized) {
    return vapidConfigured;
  }

  vapidInitialized = true;

  const publicKey = env.WEB_PUSH_VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contact = env.WEB_PUSH_CONTACT_EMAIL || 'mailto:support@fixly.app';

  if (!publicKey || !privateKey) {
    logger.warn(
      '[WebPushServer] Missing VAPID keys. Set WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_VAPID_PRIVATE_KEY to enable push delivery.'
    );
    vapidConfigured = false;
    return false;
  }

  webpush.setVapidDetails(contact, publicKey, privateKey);
  vapidConfigured = true;
  return true;
};

export async function sendWebPushMessage(
  subscription: StoredPushSubscription,
  payload: ServerPushPayload
): Promise<boolean> {
  if (!ensureVapidConfig()) {
    return false;
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-192x192.png',
    tag: payload.tag || 'fixly-notification',
    data: {
      url: payload.url || '/dashboard',
      notificationId: payload.notificationId || null,
      ...(payload.data || {}),
    },
    actions: payload.actions || [
      { action: 'view', title: 'View', icon: '/icon-192x192.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icon-192x192.png' },
    ],
    urgent: payload.urgent === true,
  });

  try {
    await webpush.sendNotification(subscription, body, {
      TTL: payload.urgent ? 60 : 60 * 60,
      urgency: payload.urgent ? 'high' : 'normal',
    });
    return true;
  } catch (error: unknown) {
    if (isRecord(error) && (error.statusCode === 404 || error.statusCode === 410)) {
      return false;
    }
    logger.error('[WebPushServer] Failed to send web push:', error);
    return false;
  }
}
