'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });

          // Service Worker registered successfully

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, prompt user to refresh
                  if (confirm('New content is available! Would you like to refresh to get the latest version?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });

          // Listen for controller change (when new SW takes over)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

        } catch (error) {
          console.error('❌ Service Worker registration failed:', error);
        }
      };

      // Register SW after page load
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // Handle background sync results
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_SUCCESS') {
          // Show success notification for background sync
          // Background sync completed
          
          // You can show a toast notification here
          if (window.showToast) {
            window.showToast('Action completed successfully!', 'success');
          }
        }
      });
    }

    // Handle online/offline status
    const handleOnline = () => {
      // Back online
      // Trigger any pending sync operations
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('background-sync');
        });
      }
    };

    const handleOffline = () => {
      // Gone offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // This component doesn't render anything
}

// Helper function to check if app is running in standalone mode
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Helper function to check if device supports PWA features
export function isPWASupported() {
  return 'serviceWorker' in navigator && 'caches' in window;
}

// Helper function to get installation status
export function getInstallationStatus() {
  const isStandalone = isPWA();
  const isSupported = isPWASupported();
  const canInstall = !isStandalone && isSupported;

  return {
    isInstalled: isStandalone,
    isSupported,
    canInstall
  };
}