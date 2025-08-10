// hooks/useLoadingTimeout.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for handling loading states with timeout messages
 * @param {number} timeoutDelay - Delay in milliseconds before showing timeout message (default: 5000ms)
 * @returns {Object} - { loading, showRefreshMessage, startLoading, stopLoading, resetTimeout }
 */
export function useLoadingTimeout(timeoutDelay = 5000) {
  const [loading, setLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const startLoading = useCallback(() => {
    setLoading(true);
    setShowRefreshMessage(false);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      if (loading) {
        setShowRefreshMessage(true);
      }
    }, timeoutDelay);
    
    setTimeoutId(newTimeoutId);
  }, [timeoutDelay, loading, timeoutId]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    setShowRefreshMessage(false);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  const resetTimeout = useCallback(() => {
    setShowRefreshMessage(false);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (loading) {
      const newTimeoutId = setTimeout(() => {
        setShowRefreshMessage(true);
      }, timeoutDelay);
      setTimeoutId(newTimeoutId);
    }
  }, [loading, timeoutDelay, timeoutId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return {
    loading,
    showRefreshMessage,
    startLoading,
    stopLoading,
    resetTimeout
  };
}

/**
 * Custom hook for API calls with loading timeout
 * @param {Function} apiCall - The API call function
 * @param {Object} options - Options { timeoutDelay, onError, onSuccess }
 * @returns {Object} - { loading, showRefreshMessage, error, data, execute, retry }
 */
export function useApiWithTimeout(apiCall, options = {}) {
  const { timeoutDelay = 5000, onError, onSuccess } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { loading, showRefreshMessage, startLoading, stopLoading } = useLoadingTimeout(timeoutDelay);

  const execute = useCallback(async (...args) => {
    try {
      setError(null);
      startLoading();
      
      const result = await apiCall(...args);
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    } finally {
      stopLoading();
    }
  }, [apiCall, startLoading, stopLoading, onError, onSuccess]);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  return {
    loading,
    showRefreshMessage,
    error,
    data,
    execute,
    retry
  };
}