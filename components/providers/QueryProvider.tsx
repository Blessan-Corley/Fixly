'use client';

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClientProvider, type Query } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, useEffect, type ReactNode } from 'react';

import { env } from '@/lib/env';

import { queryClient, backgroundSync, cacheUtils } from '../../lib/reactQuery';

type Persister = ReturnType<typeof createSyncStoragePersister>;
const PERSISTABLE_QUERY_TYPES = ['users', 'jobs', 'settings', 'profile'] as const;

const isPersistableQuery = (query: Query): boolean =>
  PERSISTABLE_QUERY_TYPES.some((type) => query.queryKey.some((key) => String(key).includes(type)));

const createPersister = (): Persister | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return createSyncStoragePersister({
    storage: window.localStorage,
    key: 'fixly-query-cache',
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  });
};

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [persister, setPersister] = useState<Persister | null>(null);

  useEffect(() => {
    const clientPersister = createPersister();
    setPersister(clientPersister);

    const handleOnline = () => {
      console.log('Connection restored - syncing offline mutations');
      void backgroundSync.syncOfflineMutations();
    };

    const handleOffline = () => {
      console.log('Connection lost - enabling offline mode');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTimeout(() => {
          cacheUtils.optimizeCache();
        }, 30000);
      }
    };

    const cacheCleanupInterval = setInterval(
      () => {
        cacheUtils.optimizeCache();
      },
      1000 * 60 * 15
    );

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(cacheCleanupInterval);
    };
  }, []);

  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24,
          hydrateOptions: {
            defaultOptions: {
              queries: {
                gcTime: 1000 * 60 * 60,
              },
            },
          },
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              isPersistableQuery(query) &&
              query.state.status === 'success' &&
              query.state.fetchStatus !== 'fetching',
          },
        }}
      >
        {children}
        <QueryDevtoolsWrapper />
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <QueryDevtoolsWrapper />
    </QueryClientProvider>
  );
}

function QueryDevtoolsWrapper() {
  if (env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <ReactQueryDevtools initialIsOpen={false} position="bottom" buttonPosition="bottom-right" />
  );
}

export function QueryPerformanceMonitor() {
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = cacheUtils.getCacheStats();

      if (env.NODE_ENV === 'development') {
        console.log('Query Cache Stats:', stats);

        if (stats.totalQueries > 100) {
          console.warn('Large query cache detected:', stats.totalQueries, 'queries');
        }

        if (stats.cacheSize > 1024 * 1024) {
          console.warn(
            'Large cache size detected:',
            Math.round(stats.cacheSize / 1024 / 1024),
            'MB'
          );
        }
      }

      if (stats.totalQueries > 200 || stats.cacheSize > 5 * 1024 * 1024) {
        console.log('Auto-optimizing query cache due to size...');
        cacheUtils.optimizeCache();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return null;
}

type QueryFallbackRenderer = (error: unknown, reset: () => void) => ReactNode;

interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: QueryFallbackRenderer;
}

export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const currentError = event.error;
      const message =
        currentError instanceof Error ? currentError.message : String(currentError ?? '');

      if (message.includes('query') || message.includes('mutation')) {
        setHasError(true);
        setError(currentError);
        console.error('React Query Error Boundary caught:', currentError);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? '');

      if (message.includes('query') || message.includes('mutation')) {
        setHasError(true);
        setError(reason);
        console.error('React Query Rejection caught:', reason);
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const resetState = () => {
    setHasError(false);
    setError(null);
    queryClient.clear();
  };

  if (hasError) {
    if (fallback) {
      return fallback(error, resetState);
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-fixly-bg dark:bg-gray-900">
        <div className="p-8 text-center">
          <div className="mb-4 text-6xl text-red-500">⚠</div>
          <h2 className="mb-2 text-2xl font-bold text-fixly-text dark:text-gray-100">
            Something went wrong with data loading
          </h2>
          <p className="mb-6 text-fixly-text-muted dark:text-gray-400">
            We&apos;re having trouble loading your data. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              resetState();
              window.location.reload();
            }}
            className="rounded-lg bg-fixly-accent px-6 py-3 text-white transition-colors hover:bg-fixly-accent-dark"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
