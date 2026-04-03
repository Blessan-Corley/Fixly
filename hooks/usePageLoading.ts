'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

import { toastMessages } from '../utils/toast';

type TimeoutHandle = ReturnType<typeof setTimeout>;

type UsePageLoadingResult = {
  loading: boolean;
  loadingMessage: string;
  showRefreshMessage: boolean;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  handleNetworkError: (error: unknown) => void;
};

export function usePageLoading(pageName = 'page'): UsePageLoadingResult {
  const [loading, setLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const timeoutRef = useRef<TimeoutHandle | null>(null);
  const refreshTimeoutRef = useRef<TimeoutHandle | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const startLoading = useCallback(
    (message = 'Loading...') => {
      setLoading(true);
      setLoadingMessage(message);
      setShowRefreshMessage(false);
      clearTimers();

      timeoutRef.current = setTimeout(() => {
        setShowRefreshMessage(true);

        refreshTimeoutRef.current = setTimeout(() => {
          toast.info('Page loading slowly', {
            description: 'Try refreshing if this continues',
            duration: 8000,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload(),
            },
          });
        }, 5000);
      }, 10000);
    },
    [clearTimers]
  );

  const stopLoading = useCallback(() => {
    setLoading(false);
    setShowRefreshMessage(false);
    clearTimers();
  }, [clearTimers]);

  const handleNetworkError = useCallback(
    (error: unknown) => {
      console.error(`Network error on ${pageName}:`, error);

      if (!navigator.onLine) {
        toastMessages.system.connectionLost();
      } else {
        toast.error('Network error', {
          description: 'Try refreshing the page',
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
        });
      }

      stopLoading();
    },
    [pageName, stopLoading]
  );

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    loading,
    loadingMessage,
    showRefreshMessage,
    startLoading,
    stopLoading,
    handleNetworkError,
  };
}
