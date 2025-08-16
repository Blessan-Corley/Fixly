'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { toastMessages } from '../utils/toast';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasShownOfflineMessage, setHasShownOfflineMessage] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setHasShownOfflineMessage(false);
      
      // Show reconnection message
      toastMessages.system.connectionRestored();
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      if (!hasShownOfflineMessage) {
        setHasShownOfflineMessage(true);
        toastMessages.system.connectionLost();
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check
    const checkConnectivity = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          timeout: 5000
        });
        
        if (!response.ok) throw new Error('Server unreachable');
        
        if (!isOnline) {
          handleOnline();
        }
      } catch (error) {
        if (isOnline) {
          handleOffline();
        }
      }
    };

    // Check connectivity every 30 seconds
    const connectivityInterval = setInterval(checkConnectivity, 30000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
    };
  }, [isOnline, hasShownOfflineMessage]);

  const checkConnection = () => {
    if (!isOnline) {
      toastMessages.system.connectionLost();
      return false;
    }
    return true;
  };

  return {
    isOnline,
    checkConnection
  };
}