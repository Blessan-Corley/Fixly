// hooks/useServiceWorker.js - Service Worker integration hooks
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Check if service worker is supported
  useEffect(() => {
    setIsSupported('serviceWorker' in navigator);
    setIsOnline(navigator.onLine);
  }, []);

  // Register service worker
  useEffect(() => {
    if (!isSupported) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        setRegistration(reg);
        setIsRegistered(true);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              toast.info('App update available!', {
                action: {
                  label: 'Update',
                  onClick: () => updateApp()
                },
                duration: 10000
              });
            }
          });
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, [isSupported]);

  // Listen for online/offline events
  useEffect(() => {
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

  // Listen for messages from service worker
  useEffect(() => {
    if (!isSupported) return;

    const handleMessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'SYNC_SUCCESS':
          toast.success('Offline action completed successfully!');
          break;
        case 'SYNC_FAILED':
          toast.error('Failed to sync offline action. Will retry later.');
          break;
        case 'CACHE_UPDATED':
          console.log('Cache updated:', payload);
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

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Update app function
  const updateApp = useCallback(() => {
    if (!registration || !registration.waiting) return;

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    registration.waiting.addEventListener('statechange', (e) => {
      if (e.target.state === 'activated') {
        window.location.reload();
      }
    });
  }, [registration]);

  // Install PWA function
  const installPWA = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      const outcome = await result.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        setInstallPrompt(null);
        return true;
      } else {
        toast.info('App installation cancelled');
        return false;
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast.error('Failed to install app');
      return false;
    }
  }, [installPrompt]);

  // Check if app is installed
  const isInstalled = useCallback(() => {
    return window.matchMedia && 
           window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
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
    registration
  };
}

// Hook for managing offline requests
export function useOfflineRequests() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get pending requests from IndexedDB
  const loadPendingRequests = useCallback(async () => {
    if (!('indexedDB' in window)) return;

    setIsLoading(true);
    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const requests = await getAllFromStore(store);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear completed requests
  const clearCompletedRequests = useCallback(async () => {
    if (!('indexedDB' in window)) return;

    try {
      const db = await openDB();
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      
      // Clear all requests (they should be completed by now)
      await store.clear();
      setPendingRequests([]);
      
      toast.success('Cleared completed offline requests');
    } catch (error) {
      console.error('Failed to clear requests:', error);
      toast.error('Failed to clear offline requests');
    }
  }, []);

  // Retry failed requests
  const retryFailedRequests = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('retry-failed');
      toast.info('Retrying failed requests...');
    } catch (error) {
      console.error('Failed to retry requests:', error);
      toast.error('Failed to retry offline requests');
    }
  }, []);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  return {
    pendingRequests,
    isLoading,
    loadPendingRequests,
    clearCompletedRequests,
    retryFailedRequests
  };
}

// Hook for PWA-specific features
export function usePWAFeatures() {
  const [canShare, setCanShare] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setCanShare('share' in navigator);
    setIsFullscreen(window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);
  }, []);

  // Share content using Web Share API
  const shareContent = useCallback(async (data) => {
    if (!canShare) {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(data.url || data.text);
        toast.success('Link copied to clipboard!');
        return true;
      } catch (error) {
        toast.error('Failed to share content');
        return false;
      }
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Sharing failed:', error);
        toast.error('Failed to share content');
      }
      return false;
    }
  }, [canShare]);

  // Request fullscreen
  const requestFullscreen = useCallback(async () => {
    if (!document.documentElement.requestFullscreen) return false;

    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      return true;
    } catch (error) {
      console.error('Fullscreen request failed:', error);
      return false;
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    if (!document.exitFullscreen) return false;

    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
      return true;
    } catch (error) {
      console.error('Exit fullscreen failed:', error);
      return false;
    }
  }, []);

  return {
    canShare,
    shareContent,
    isFullscreen,
    requestFullscreen,
    exitFullscreen
  };
}

// Hook for background sync
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false);
  const [pendingSyncs, setPendingSyncs] = useState([]);

  useEffect(() => {
    setIsSupported(
      'serviceWorker' in navigator && 
      'sync' in window.ServiceWorkerRegistration.prototype
    );
  }, []);

  // Register background sync
  const registerSync = useCallback(async (tag, data) => {
    if (!isSupported) {
      console.warn('Background sync not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      
      // Store sync data locally
      setPendingSyncs(prev => [...prev, { tag, data, timestamp: Date.now() }]);
      
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }, [isSupported]);

  // Remove completed sync
  const removeSync = useCallback((tag) => {
    setPendingSyncs(prev => prev.filter(sync => sync.tag !== tag));
  }, []);

  return {
    isSupported,
    pendingSyncs,
    registerSync,
    removeSync
  };
}

// Helper functions
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FixlyOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

async function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export default {
  useServiceWorker,
  useOfflineRequests,
  usePWAFeatures,
  useBackgroundSync
};