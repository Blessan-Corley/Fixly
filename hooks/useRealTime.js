// hooks/useRealTime.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';

export function useRealTime(endpoint, interval = 3000, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const lastFetchRef = useRef(0);
  const backgroundUpdateRef = useRef(false);
  const { isOnline } = useNetworkStatus();
  
  const {
    enabled = true,
    silent = true, // Default to silent for background updates
    onUpdate = null,
    dependencies = [],
    showInitialLoading = false // Only show loading on initial fetch
  } = options;

  const fetchData = useCallback(async (isInitial = false) => {
    // Check if auto-refresh is disabled via settings
    const autoRefreshEnabled = document.cookie
      .split('; ')
      .find(row => row.startsWith('autoRefresh='))
      ?.split('=')[1] !== 'false';

    if (!enabled || (!isInitial && !autoRefreshEnabled) || (!isInitial && !isOnline)) {
      return;
    }

    // Prevent too frequent requests
    const now = Date.now();
    if (!isInitial && now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      // Only show loading for initial fetch if explicitly requested
      if (isInitial && showInitialLoading) setLoading(true);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const newData = await response.json();
      
      // Only update if data has actually changed (deep comparison for better efficiency)
      const hasChanged = JSON.stringify(newData) !== JSON.stringify(data);
      if (hasChanged) {
        setData(newData);
        backgroundUpdateRef.current = !isInitial; // Track if this was a background update
        if (onUpdate) onUpdate(newData, backgroundUpdateRef.current);
      }
      
      setError(null);
    } catch (err) {
      // Only log errors for initial fetches, silently handle background errors
      if (isInitial) {
        setError(err.message);
        console.error('Real-time fetch error:', err);
      }
    } finally {
      if (isInitial && showInitialLoading) setLoading(false);
    }
  }, [endpoint, enabled, silent, onUpdate, data]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData(true);
    }
  }, [enabled, ...dependencies]);

  // Set up polling
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      fetchData(false);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, interval, enabled]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh
  };
}

// Hook for real-time notifications - completely silent background updates
export function useRealTimeNotifications() {
  return useRealTime('/api/user/notifications', 8000, {
    silent: true,
    showInitialLoading: false,
    onUpdate: (data, isBackgroundUpdate) => {
      // Silently update notification badges
      const event = new CustomEvent('notificationsUpdated', { 
        detail: { ...data, isBackgroundUpdate } 
      });
      window.dispatchEvent(event);
    }
  });
}

// Hook for real-time messages - silent background updates
export function useRealTimeMessages(jobId) {
  return useRealTime(`/api/jobs/${jobId}/messages`, 2000, {
    silent: true,
    showInitialLoading: false,
    enabled: !!jobId,
    dependencies: [jobId]
  });
}

// Hook for real-time comments - silent background updates
export function useRealTimeComments(jobId) {
  return useRealTime(`/api/jobs/${jobId}/comments`, 3000, {
    silent: true,
    showInitialLoading: false,
    enabled: !!jobId,
    dependencies: [jobId]
  });
}