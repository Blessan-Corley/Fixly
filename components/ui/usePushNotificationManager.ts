'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAbly } from '../../contexts/AblyContext';

import {
  ensureServiceWorkerRegistration,
  getCurrentBrowserSubscription,
  isPushSubscriptionPayload,
  urlBase64ToArrayBuffer,
} from './PushNotificationManager.utils';
import type {
  NotificationPreferencesResponse,
  PushSubscriptionStatusResponse,
} from './PushNotificationManager.utils';

export type PushNotificationManagerState = {
  supported: boolean;
  enabled: boolean;
  loading: boolean;
  permissionState: NotificationPermission;
  statusMessage: string;
  isConnected: boolean;
  handleToggle: () => void;
};

export function usePushNotificationManager(): PushNotificationManagerState {
  const { data: session } = useSession();
  const { isConnected } = useAbly();
  const [supported, setSupported] = useState<boolean>(false);
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [statusMessage, setStatusMessage] = useState<string>('Push notifications are off');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasSupport =
      'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

    setSupported(hasSupport);
    if (hasSupport) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const updatePreference = async (browserNotifications: boolean): Promise<boolean> => {
    const response = await fetch('/api/user/notification-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ browserNotifications }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as NotificationPreferencesResponse;
    return payload.success !== false;
  };

  const syncSubscriptionState = useCallback(async (): Promise<void> => {
    if (!supported || !session) {
      return;
    }

    try {
      const [browserSubscription, response] = await Promise.all([
        getCurrentBrowserSubscription(),
        fetch('/api/user/push-subscription', { method: 'GET', cache: 'no-store' }),
      ]);

      const payload = (await response.json()) as PushSubscriptionStatusResponse;
      const serverSubscribed =
        payload.subscribed === true && isPushSubscriptionPayload(payload.subscription);
      const browserSubscribed = browserSubscription !== null;
      const hasSubscription =
        Notification.permission === 'granted' && (serverSubscribed || browserSubscribed);

      setEnabled(hasSubscription);
      setPermissionState(Notification.permission);

      if (Notification.permission !== 'granted') {
        setStatusMessage('Browser permission is not granted');
        return;
      }

      setStatusMessage(
        hasSubscription ? 'Push notifications are active' : 'Push notifications are off'
      );
    } catch (error: unknown) {
      console.error('Failed to sync push subscription state:', error);
      setStatusMessage('Unable to verify push notification status');
    }
  }, [session, supported]);

  useEffect(() => {
    if (!supported || !session) {
      return;
    }

    void syncSubscriptionState();
  }, [session, supported, syncSubscriptionState]);

  const enableNotifications = async (): Promise<void> => {
    if (!supported || !session) {
      return;
    }

    setLoading(true);

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        setEnabled(false);
        setStatusMessage('Browser permission is not granted');
        toast.error('Browser notifications permission denied');
        return;
      }

      const statusResponse = await fetch('/api/user/push-subscription', {
        method: 'GET',
        cache: 'no-store',
      });
      const statusPayload = (await statusResponse.json()) as PushSubscriptionStatusResponse;
      const publicKey =
        typeof statusPayload.publicKey === 'string' ? statusPayload.publicKey.trim() : '';

      if (!publicKey) {
        throw new Error('VAPID public key is not configured');
      }

      const registration = await ensureServiceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey),
        }));

      const subscriptionPayload = subscription.toJSON();
      if (!isPushSubscriptionPayload(subscriptionPayload)) {
        throw new Error('Failed to create a valid push subscription');
      }

      const saveSubscriptionResponse = await fetch('/api/user/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscriptionPayload }),
      });

      if (!saveSubscriptionResponse.ok) {
        throw new Error('Failed to save push subscription');
      }

      const saved = await updatePreference(true);
      if (!saved) {
        throw new Error('Failed to save notification preferences');
      }

      setEnabled(true);
      setStatusMessage('Push notifications are active');

      await registration.showNotification('Fixly Notifications Enabled', {
        body: 'You will now receive real-time push notifications for messages, jobs, and updates.',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'push-enabled-confirmation',
        data: { url: '/dashboard/notifications' },
      });

      toast.success('Push notifications enabled');
    } catch (error: unknown) {
      console.error('Error enabling notifications:', error);
      setEnabled(false);
      setStatusMessage('Failed to enable push notifications');
      toast.error(error instanceof Error ? error.message : 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async (): Promise<void> => {
    if (!supported || !session) {
      return;
    }

    setLoading(true);

    try {
      const registration = await ensureServiceWorkerRegistration();
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const [deleteResponse, saved] = await Promise.all([
        fetch('/api/user/push-subscription', { method: 'DELETE' }),
        updatePreference(false),
      ]);

      if (!deleteResponse.ok || !saved) {
        throw new Error('Failed to disable push notifications');
      }

      setEnabled(false);
      setStatusMessage('Push notifications are off');
      toast.success('Push notifications disabled');
    } catch (error: unknown) {
      console.error('Error disabling notifications:', error);
      toast.error('Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (): void => {
    if (enabled) {
      void disableNotifications();
      return;
    }
    void enableNotifications();
  };

  return {
    supported,
    enabled,
    loading,
    permissionState,
    statusMessage,
    isConnected,
    handleToggle,
  };
}
