import { useState, useEffect, useCallback, useRef } from 'react';

type TimeoutHandle = ReturnType<typeof setTimeout>;

export type UseLoadingTimeoutResult = {
  loading: boolean;
  showRefreshMessage: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  resetTimeout: () => void;
};

export function useLoadingTimeout(timeoutDelay = 5000): UseLoadingTimeoutResult {
  const [loading, setLoading] = useState(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState(false);
  const timeoutRef = useRef<TimeoutHandle | null>(null);
  const loadingRef = useRef(false);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoading = useCallback(() => {
    setLoading(true);
    loadingRef.current = true;
    setShowRefreshMessage(false);

    clearExistingTimeout();
    timeoutRef.current = setTimeout(() => {
      if (loadingRef.current) {
        setShowRefreshMessage(true);
      }
    }, timeoutDelay);
  }, [clearExistingTimeout, timeoutDelay]);

  const stopLoading = useCallback(() => {
    setLoading(false);
    loadingRef.current = false;
    setShowRefreshMessage(false);
    clearExistingTimeout();
  }, [clearExistingTimeout]);

  const resetTimeout = useCallback(() => {
    setShowRefreshMessage(false);
    clearExistingTimeout();

    if (loadingRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (loadingRef.current) {
          setShowRefreshMessage(true);
        }
      }, timeoutDelay);
    }
  }, [clearExistingTimeout, timeoutDelay]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return {
    loading,
    showRefreshMessage,
    startLoading,
    stopLoading,
    resetTimeout,
  };
}

type UseApiWithTimeoutOptions<TData, TError = unknown> = {
  timeoutDelay?: number;
  onError?: (error: TError) => void;
  onSuccess?: (result: TData) => void;
};

type UseApiWithTimeoutResult<TData, TArgs extends unknown[], TError = unknown> = {
  loading: boolean;
  showRefreshMessage: boolean;
  error: TError | null;
  data: TData | null;
  execute: (...args: TArgs) => Promise<TData>;
  retry: (...args: TArgs) => Promise<TData>;
};

export function useApiWithTimeout<TData, TArgs extends unknown[], TError = unknown>(
  apiCall: (...args: TArgs) => Promise<TData>,
  options: UseApiWithTimeoutOptions<TData, TError> = {}
): UseApiWithTimeoutResult<TData, TArgs, TError> {
  const { timeoutDelay = 5000, onError, onSuccess } = options;
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<TError | null>(null);
  const { loading, showRefreshMessage, startLoading, stopLoading } =
    useLoadingTimeout(timeoutDelay);

  const execute = useCallback(
    async (...args: TArgs): Promise<TData> => {
      try {
        setError(null);
        startLoading();

        const result = await apiCall(...args);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const typedError = err as TError;
        setError(typedError);
        onError?.(typedError);
        throw typedError;
      } finally {
        stopLoading();
      }
    },
    [apiCall, onError, onSuccess, startLoading, stopLoading]
  );

  const retry = useCallback((...args: TArgs) => execute(...args), [execute]);

  return {
    loading,
    showRefreshMessage,
    error,
    data,
    execute,
    retry,
  };
}
