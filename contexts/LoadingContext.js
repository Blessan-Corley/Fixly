// contexts/LoadingContext.js
'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useLoadingTimeout } from '../hooks/useLoadingTimeout';

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [loadingStates, setLoadingStates] = useState({});
  const [pageLoading, setPageLoading] = useState(false);
  const { 
    loading: globalLoading, 
    showRefreshMessage: globalShowRefreshMessage, 
    startLoading: globalStartLoading, 
    stopLoading: globalStopLoading 
  } = useLoadingTimeout(6000); // 6 seconds for global loading

  // Set loading state for specific component/page
  const setLoading = useCallback((key, loading, message = 'Loading...') => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { loading, message }
    }));
  }, []);

  // Get loading state for specific component/page
  const getLoading = useCallback((key) => {
    return loadingStates[key] || { loading: false, message: 'Loading...' };
  }, [loadingStates]);

  // Start global page loading
  const startPageLoading = useCallback((message = 'Loading page...') => {
    setPageLoading(true);
    globalStartLoading();
  }, [globalStartLoading]);

  // Stop global page loading
  const stopPageLoading = useCallback(() => {
    setPageLoading(false);
    globalStopLoading();
  }, [globalStopLoading]);

  // Check if any component is loading
  const isAnyLoading = useCallback(() => {
    return globalLoading || pageLoading || Object.values(loadingStates).some(state => state.loading);
  }, [globalLoading, pageLoading, loadingStates]);

  const value = {
    // Global loading
    globalLoading,
    globalShowRefreshMessage,
    startPageLoading,
    stopPageLoading,
    
    // Component-specific loading
    setLoading,
    getLoading,
    
    // Utilities
    isAnyLoading,
    loadingStates
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Hook for page-specific loading with automatic cleanup
export function usePageLoading(pageName) {
  const { setLoading, getLoading } = useLoading();
  const loadingTimeout = useLoadingTimeout(5000);

  const startLoading = useCallback((message) => {
    setLoading(pageName, true, message);
    loadingTimeout.startLoading();
  }, [pageName, setLoading, loadingTimeout]);

  const stopLoading = useCallback(() => {
    setLoading(pageName, false);
    loadingTimeout.stopLoading();
  }, [pageName, setLoading, loadingTimeout]);

  const currentState = getLoading(pageName);

  return {
    loading: currentState.loading,
    showRefreshMessage: loadingTimeout.showRefreshMessage,
    startLoading,
    stopLoading,
    message: currentState.message
  };
}