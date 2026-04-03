'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { BeforeInstallPromptEvent } from './serviceWorker/serviceWorker.types';
import { SERVICE_WORKER_SYNC_TAGS } from './serviceWorker/serviceWorker.types';
import type { SWMessagePayload } from './serviceWorker/serviceWorker.types';

export { useBackgroundSync } from './useBackgroundSync';
export { useOfflineRequests } from './useOfflineRequests';
export { usePWAFeatures } from './usePWAFeatures';
export { SERVICE_WORKER_SYNC_TAGS } from './serviceWorker/serviceWorker.types';

export function useServiceWorker(): {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  updateApp: () => void;
  installPrompt: boolean;
  installPWA: () => Promise<boolean>;
  isInstalled: boolean;
  registration: ServiceWorkerRegistration | null;
} {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsSupported('serviceWorker' in navigator);
    setIsOnline(navigator.onLine);
  }, []);

  const updateApp = useCallback(() => {
    if (!registration?.waiting) {
      return;
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    registration.waiting.addEventListener('statechange', (event) => {
      const target = event.target as ServiceWorker | null;
      if (target?.state === 'activated') {
        window.location.reload();
      }
    });
  }, [registration]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        setRegistration(reg);
        setIsRegistered(true);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              toast.info('App update available!', {
                action: {
                  label: 'Update',
                  onClick: () => updateApp(),
                },
                duration: 10000,
              });
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW().catch((error) => {
      console.error('Service Worker setup failed:', error);
    });
  }, [isSupported, updateApp]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored!');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are now offline. Some features may be limited.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const handleMessage = (event: MessageEvent<SWMessagePayload>) => {
      const { type } = event.data || {};

      switch (type) {
        case 'SYNC_SUCCESS':
          toast.success('Offline action completed successfully!');
          break;
        case 'SYNC_FAILED':
          toast.error('Failed to sync offline action. Will retry later.');
          break;
        case 'CACHE_UPDATED':
          break;
        default:
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isSupported]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        setInstallPrompt(null);
        return true;
      }

      toast.info('App installation cancelled');
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast.error('Failed to install app');
      return false;
    }
  }, [installPrompt]);

  const isInstalled = useCallback(() => {
    const inStandaloneMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    const iosStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return inStandaloneMode || iosStandalone;
  }, []);

  return {
    isSupported,
    isRegistered,
    isOnline,
    updateAvailable,
    updateApp,
    installPrompt: !!installPrompt,
    installPWA,
    isInstalled: isInstalled(),
    registration,
  };
}

export default {
  useServiceWorker,
};
