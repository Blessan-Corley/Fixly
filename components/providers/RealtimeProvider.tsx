'use client';

import { useQueryClient } from '@tanstack/react-query';
import Ably from 'ably';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { toast } from 'sonner';

import { getAblyClient, closeAblyClient } from '@/lib/ably/client';
import {
  Channels,
  Events,
  type NotificationSentPayload,
  type PaymentConfirmedPayload,
  type SubscriptionActivatedPayload,
} from '@/lib/ably/events';
import { queryKeys } from '@/lib/queries/keys';
import { useConnectionStore } from '@/lib/stores/connectionStore';
import { useNotificationStore } from '@/lib/stores/notificationStore';

type RealtimeProviderProps = {
  children: ReactNode;
};

type RealtimeChannel = ReturnType<Ably.Realtime['channels']['get']>;

function isSubscriptionActivatedPayload(value: unknown): value is SubscriptionActivatedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'planId' in value &&
    typeof value.planId === 'string' &&
    'activatedAt' in value &&
    typeof value.activatedAt === 'string'
  );
}

export function RealtimeProvider({ children }: RealtimeProviderProps): React.JSX.Element {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const setAblyStatus = useConnectionStore((state) => state.setAblyStatus);
  const incrementReconnectAttempts = useConnectionStore((state) => state.incrementReconnectAttempts);
  const resetReconnectAttempts = useConnectionStore((state) => state.resetReconnectAttempts);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wasDisconnected = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    const userId = session.user.id;
    const client = getAblyClient();
    clientRef.current = client;

    const onConnecting = (): void => {
      setAblyStatus('connecting');
    };
    const onConnected = (): void => {
      setAblyStatus('connected');
      resetReconnectAttempts();

      if (wasDisconnected.current) {
        void queryClient.invalidateQueries();
        wasDisconnected.current = false;
        toast('Connection restored', {
          description: 'Refreshing latest data...',
        });
      }
    };
    const onDisconnected = (): void => {
      setAblyStatus('disconnected');
      wasDisconnected.current = true;
    };
    const onSuspended = (): void => {
      setAblyStatus('suspended');
      incrementReconnectAttempts();
      wasDisconnected.current = true;
    };
    const onFailed = (): void => {
      setAblyStatus('failed');
      wasDisconnected.current = true;
    };
    const onClosed = (): void => {
      setAblyStatus('disconnected');
      wasDisconnected.current = true;
    };

    client.connection.on('connecting', onConnecting);
    client.connection.on('connected', onConnected);
    client.connection.on('disconnected', onDisconnected);
    client.connection.on('suspended', onSuspended);
    client.connection.on('failed', onFailed);
    client.connection.on('closed', onClosed);

    const userChannel = client.channels.get(Channels.user(userId));
    channelRef.current = userChannel;

    const handleNotification = (message: Ably.Message): void => {
      const payload = message.data as NotificationSentPayload;
      addNotification({
        _id: payload.notificationId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        read: false,
        createdAt: payload.createdAt,
      });

      toast(payload.title || 'New notification', {
        description: payload.message,
      });
    };

    const handleNotificationRead = (message: Ably.Message): void => {
      const payload =
        message.data && typeof message.data === 'object'
          ? (message.data as { notificationId?: string })
          : {};
      const notificationId = typeof payload.notificationId === 'string' ? payload.notificationId : '';

      if (!notificationId) {
        return;
      }

      markAsRead(notificationId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    const handleAllNotificationsRead = (): void => {
      markAllAsRead();
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    };

    const handlePaymentConfirmed = (message: Ably.Message): void => {
      const payload = message.data as PaymentConfirmedPayload;

      toast.success('Payment confirmed!', {
        description: `${payload.currency?.toUpperCase?.() || 'INR'} ${payload.amount} payment processed successfully`,
      });

      if (payload.jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(payload.jobId) });
      }
    };

    const handleSubscriptionActivated = (message: Ably.Message): void => {
      if (!isSubscriptionActivatedPayload(message.data)) {
        return;
      }

      toast.success('Subscription activated', {
        description: `Your ${message.data.planId} plan is now active.`,
      });

      void queryClient.invalidateQueries();
    };

    const handleAccountSuspended = (): void => {
      toast.error('Your account has been suspended. Please contact support.');
      window.setTimeout(() => {
        closeAblyClient();
        void signOut({ callbackUrl: '/auth/signin' });
      }, 3000);
    };

    userChannel.subscribe(Events.user.notificationSent, handleNotification);
    userChannel.subscribe(Events.user.notificationRead, handleNotificationRead);
    userChannel.subscribe(Events.user.allNotificationsRead, handleAllNotificationsRead);
    userChannel.subscribe(Events.user.paymentConfirmed, handlePaymentConfirmed);
    userChannel.subscribe(Events.user.subscriptionActivated, handleSubscriptionActivated);
    userChannel.subscribe(Events.user.accountSuspended, handleAccountSuspended);

    return () => {
      client.connection.off('connecting', onConnecting);
      client.connection.off('connected', onConnected);
      client.connection.off('disconnected', onDisconnected);
      client.connection.off('suspended', onSuspended);
      client.connection.off('failed', onFailed);
      client.connection.off('closed', onClosed);

      if (channelRef.current) {
        channelRef.current.unsubscribe(Events.user.notificationSent, handleNotification);
        channelRef.current.unsubscribe(Events.user.notificationRead, handleNotificationRead);
        channelRef.current.unsubscribe(
          Events.user.allNotificationsRead,
          handleAllNotificationsRead
        );
        channelRef.current.unsubscribe(Events.user.paymentConfirmed, handlePaymentConfirmed);
        channelRef.current.unsubscribe(
          Events.user.subscriptionActivated,
          handleSubscriptionActivated
        );
        channelRef.current.unsubscribe(Events.user.accountSuspended, handleAccountSuspended);
      }
    };
  }, [
    addNotification,
    incrementReconnectAttempts,
    markAllAsRead,
    markAsRead,
    queryClient,
    resetReconnectAttempts,
    session?.user?.id,
    setAblyStatus,
    status,
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      closeAblyClient();
      clientRef.current = null;
      channelRef.current = null;
      setAblyStatus('disconnected');
      resetReconnectAttempts();
    }
  }, [resetReconnectAttempts, setAblyStatus, status]);

  return <>{children}</>;
}
