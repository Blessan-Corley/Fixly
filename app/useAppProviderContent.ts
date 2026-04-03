'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useUserProfileQuery } from '../hooks/query/users';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { createFetchWithCsrf } from '../lib/api/fetchWithCsrf';
import { setSentryUser } from '../lib/sentry';
import { useAuthStore } from '../lib/stores/authStore';
import { useNotificationStore } from '../lib/stores/notificationStore';

import { isRecord, isPendingSessionId } from './providers.helpers';
import type { AppContextValue, AppNotification, AppUser } from './providers.types';

export function useAppProviderContent(): AppContextValue {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, checkConnection } = useNetworkStatus();
  const setCsrfToken = useAuthStore((state) => state.setCsrfToken);
  const clearCsrfToken = useAuthStore((state) => state.clearCsrfToken);
  const notifications = useNotificationStore((state) => state.notifications as AppNotification[]);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const replaceNotificationsInStore = useNotificationStore((state) => state.setNotifications);
  const removeNotificationFromStore = useNotificationStore((state) => state.removeNotification);
  const csrfRequestRef = useRef<AbortController | null>(null);

  const sessionUserId = session?.user?.id ?? '';
  const sessionCsrfToken =
    typeof session?.user?.csrfToken === 'string' ? session.user.csrfToken : null;
  const shouldSkipProfile =
    !sessionUserId ||
    isPendingSessionId(sessionUserId) ||
    session?.user?.isRegistered === false ||
    session?.user?.needsOnboarding === true;

  const {
    data: userProfileResponse,
    isLoading: userProfileLoading,
    isFetching: userProfileFetching,
  } = useUserProfileQuery({
    enabled: status === 'authenticated' && !shouldSkipProfile,
    retry: 1,
    staleTime: 1000 * 30,
  });

  const clearNotification = useCallback(
    (messageId: string) => {
      removeNotificationFromStore(messageId);
    },
    [removeNotificationFromStore]
  );

  const clearAllNotifications = useCallback(() => {
    replaceNotificationsInStore([]);
  }, [replaceNotificationsInStore]);

  const replaceNotifications = useCallback(
    (items: AppNotification[]) => {
      replaceNotificationsInStore(items);
    },
    [replaceNotificationsInStore]
  );

  useEffect(() => {
    setSentryUser(session ?? null);
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = createFetchWithCsrf(originalFetch);

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      csrfRequestRef.current?.abort();
      clearCsrfToken();
      return;
    }

    if (sessionCsrfToken) {
      setCsrfToken(sessionCsrfToken);
    }

    csrfRequestRef.current?.abort();
    const controller = new AbortController();
    csrfRequestRef.current = controller;

    void (async (): Promise<void> => {
      try {
        const response = await window.fetch('/api/auth/csrf-token', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch CSRF token: ${response.status}`);
        }

        const payload = (await response.json()) as {
          data?: { csrfToken?: string };
        };
        const token = typeof payload.data?.csrfToken === 'string' ? payload.data.csrfToken : null;

        if (token) {
          setCsrfToken(token);
          return;
        }

        clearCsrfToken();
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'AbortError') {
          return;
        }
        clearCsrfToken();
      }
    })();

    return () => {
      controller.abort();
    };
  }, [clearCsrfToken, sessionCsrfToken, setCsrfToken, status]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (status !== 'authenticated' || shouldSkipProfile) {
      setUser(null);
      setError(null);
      replaceNotificationsInStore([]);
      clearCsrfToken();
      setLoading(false);
      return;
    }

    if (userProfileLoading || userProfileFetching) {
      setLoading(true);
      return;
    }

    const responseData = isRecord(userProfileResponse) ? userProfileResponse : null;
    if (!responseData || !isRecord(responseData.user)) {
      setError('Failed to load user profile');
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(responseData.user as AppUser);
    setError(null);
    setLoading(false);
  }, [
    shouldSkipProfile,
    status,
    userProfileFetching,
    userProfileLoading,
    userProfileResponse,
    replaceNotificationsInStore,
    clearCsrfToken,
  ]);

  const updateUser = useCallback((userData: Partial<AppUser>) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return userData as AppUser;
      }
      const mergedUser: AppUser = { ...previousUser, ...userData };
      const hasChanges = Object.keys(userData).some((key) => previousUser[key] !== mergedUser[key]);
      return hasChanges ? mergedUser : previousUser;
    });
  }, []);

  return useMemo<AppContextValue>(
    () => ({
      user,
      setUser,
      loading,
      notifications,
      unreadCount,
      clearNotification,
      clearAllNotifications,
      replaceNotifications,
      updateUser,
      session: session ?? null,
      isAuthenticated: status === 'authenticated',
      error,
      isOnline,
      checkConnection,
    }),
    [
      user,
      loading,
      notifications,
      unreadCount,
      clearNotification,
      clearAllNotifications,
      replaceNotifications,
      updateUser,
      session,
      status,
      error,
      isOnline,
      checkConnection,
    ]
  );
}
