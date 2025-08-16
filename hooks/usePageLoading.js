'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { toastMessages } from '../utils/toast';

export function usePageLoading(pageName = 'page') {
  const [loading, setLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const timeoutRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  const startLoading = (message = 'Loading...') => {
    setLoading(true);
    setLoadingMessage(message);
    setShowRefreshMessage(false);

    // Clear any existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    // Show refresh message after 10 seconds
    timeoutRef.current = setTimeout(() => {
      setShowRefreshMessage(true);
      
      // Show toast after 15 seconds
      refreshTimeoutRef.current = setTimeout(() => {
        toast.info('Page loading slowly', {
          description: 'Try refreshing if this continues',
          duration: 8000,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      }, 5000);
    }, 10000);
  };

  const stopLoading = () => {
    setLoading(false);
    setShowRefreshMessage(false);
    
    // Clear timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
  };

  // Network error handler
  const handleNetworkError = (error) => {
    console.error(`Network error on ${pageName}:`, error);
    
    if (!navigator.onLine) {
      toastMessages.system.connectionLost();
    } else {
      toast.error('Network error', {
        description: 'Try refreshing the page',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }
    
    stopLoading();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  return {
    loading,
    loadingMessage,
    showRefreshMessage,
    startLoading,
    stopLoading,
    handleNetworkError
  };
}