'use client';

import { useEffect, useRef, useState } from 'react';

import { toastMessages } from '../utils/toast';

type UseNetworkStatusResult = {
  isOnline: boolean;
  checkConnection: () => boolean;
};

const HEALTH_CHECK_TIMEOUT_MS = 5000;
const HEALTH_CHECK_INTERVAL_MS = 30000;

export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const hasShownOfflineMessageRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      hasShownOfflineMessageRef.current = false;
      toastMessages.system.connectionRestored();
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (!hasShownOfflineMessageRef.current) {
        hasShownOfflineMessageRef.current = true;
        toastMessages.system.connectionLost();
      }
    };

    const checkConnectivity = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Server unreachable');
        }

        if (!navigator.onLine || !isOnline) {
          handleOnline();
        }
      } catch {
        if (navigator.onLine && isOnline) {
          handleOffline();
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connectivityInterval = setInterval(checkConnectivity, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
    };
  }, [isOnline]);

  const checkConnection = () => {
    if (!isOnline) {
      toastMessages.system.connectionLost();
      return false;
    }
    return true;
  };

  return {
    isOnline,
    checkConnection,
  };
}
