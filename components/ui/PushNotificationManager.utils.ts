export type NotificationPreferencesResponse = {
  success?: boolean;
  message?: string;
};

export type PushSubscriptionKeys = {
  auth?: unknown;
  p256dh?: unknown;
};

export type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: PushSubscriptionKeys;
  expirationTime?: unknown;
};

export type PushSubscriptionStatusResponse = {
  success?: boolean;
  subscribed?: boolean;
  subscription?: PushSubscriptionPayload | null;
  publicKey?: string | null;
  message?: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPushSubscriptionPayload(value: unknown): value is PushSubscriptionPayload {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.endpoint !== 'string' || value.endpoint.trim().length === 0) {
    return false;
  }

  if (!isRecord(value.keys)) {
    return false;
  }

  return typeof value.keys.auth === 'string' && typeof value.keys.p256dh === 'string';
}

export function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray.buffer;
}

export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existingRegistration = await navigator.serviceWorker.getRegistration('/');
  if (existingRegistration) {
    await navigator.serviceWorker.ready;
    return existingRegistration;
  }

  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });

  await navigator.serviceWorker.ready;
  return registration;
}

export async function getCurrentBrowserSubscription(): Promise<PushSubscription | null> {
  const registration = await ensureServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}
