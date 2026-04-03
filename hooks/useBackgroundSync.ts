'use client';

import { useCallback, useEffect, useState } from 'react';

import type { PendingSync } from './serviceWorker/serviceWorker.types';
import { requestSync } from './serviceWorker/serviceWorker.utils';

export function useBackgroundSync(): {
  isSupported: boolean;
  pendingSyncs: PendingSync[];
  registerSync: (tag: string, data: unknown) => Promise<boolean>;
  requestSync: (tag: string) => Promise<void>;
  removeSync: (tag: string) => void;
} {
  const [isSupported, setIsSupported] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState<PendingSync[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsSupported(
      'serviceWorker' in navigator && 'sync' in (window.ServiceWorkerRegistration?.prototype || {})
    );
  }, []);

  const registerSync = useCallback(
    async (tag: string, data: unknown): Promise<boolean> => {
      if (!isSupported) {
        return false;
      }

      try {
        await requestSync(tag);
        setPendingSyncs((prev) => [...prev, { tag, data, timestamp: Date.now() }]);
        return true;
      } catch (error) {
        console.error('Background sync registration failed:', error);
        return false;
      }
    },
    [isSupported]
  );

  const removeSync = useCallback((tag: string): void => {
    setPendingSyncs((prev) => prev.filter((sync) => sync.tag !== tag));
  }, []);

  return {
    isSupported,
    pendingSyncs,
    registerSync,
    requestSync,
    removeSync,
  };
}
