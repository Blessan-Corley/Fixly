'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

import { useLoadingTimeout } from '../hooks/useLoadingTimeout';

type LoadingEntry = {
  loading: boolean;
  message: string;
};

type LoadingMap = Record<string, LoadingEntry>;

type LoadingContextValue = {
  globalLoading: boolean;
  globalShowRefreshMessage: boolean;
  startPageLoading: (message?: string) => void;
  stopPageLoading: () => void;
  setLoading: (key: string, loading: boolean, message?: string) => void;
  getLoading: (key: string) => LoadingEntry;
  isAnyLoading: () => boolean;
  loadingStates: LoadingMap;
};

type LoadingProviderProps = {
  children: ReactNode;
};

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<LoadingMap>({});
  const [pageLoading, setPageLoading] = useState(false);
  const {
    loading: globalLoading,
    showRefreshMessage: globalShowRefreshMessage,
    startLoading: globalStartLoading,
    stopLoading: globalStopLoading,
  } = useLoadingTimeout(6000);

  const setLoading = useCallback((key: string, loading: boolean, message = 'Loading...') => {
    setLoadingStates((prev) => ({
      ...prev,
      [key]: { loading, message },
    }));
  }, []);

  const getLoading = useCallback(
    (key: string): LoadingEntry => loadingStates[key] || { loading: false, message: 'Loading...' },
    [loadingStates]
  );

  const startPageLoading = useCallback(
    (_message = 'Loading page...') => {
      setPageLoading(true);
      globalStartLoading();
    },
    [globalStartLoading]
  );

  const stopPageLoading = useCallback(() => {
    setPageLoading(false);
    globalStopLoading();
  }, [globalStopLoading]);

  const isAnyLoading = useCallback(() => {
    return (
      globalLoading || pageLoading || Object.values(loadingStates).some((state) => state.loading)
    );
  }, [globalLoading, loadingStates, pageLoading]);

  const value: LoadingContextValue = {
    globalLoading,
    globalShowRefreshMessage,
    startPageLoading,
    stopPageLoading,
    setLoading,
    getLoading,
    isAnyLoading,
    loadingStates,
  };

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

type UsePageLoadingResult = {
  loading: boolean;
  showRefreshMessage: boolean;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  message: string;
};

export function usePageLoading(pageName: string): UsePageLoadingResult {
  const { setLoading, getLoading } = useLoading();
  const {
    showRefreshMessage,
    startLoading: startTimeout,
    stopLoading: stopTimeout,
  } = useLoadingTimeout(5000);

  const startLoading = useCallback(
    (message = 'Loading...') => {
      setLoading(pageName, true, message);
      startTimeout();
    },
    [pageName, setLoading, startTimeout]
  );

  const stopLoading = useCallback(() => {
    setLoading(pageName, false);
    stopTimeout();
  }, [pageName, setLoading, stopTimeout]);

  const currentState = getLoading(pageName);

  return {
    loading: currentState.loading,
    showRefreshMessage,
    startLoading,
    stopLoading,
    message: currentState.message,
  };
}
