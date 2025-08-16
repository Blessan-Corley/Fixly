'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { useState, useEffect } from 'react';
import { queryClient } from '../../lib/reactQuery';
import { backgroundSync, cacheUtils } from '../../lib/reactQuery';

// Create persister for offline caching
const createPersister = () => {
  if (typeof window !== 'undefined') {
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'fixly-query-cache',
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      // Only persist certain queries
      filters: {
        predicate: (query) => {
          // Persist user data, job listings, and settings
          const persistableQueries = ['users', 'jobs', 'settings', 'profile'];
          return persistableQueries.some(type => 
            query.queryKey.some(key => String(key).includes(type))
          );
        }
      }
    });
  }
  return null;
};

export default function QueryProvider({ children }) {
  const [persister, setPersister] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Initialize persister only on client side
    const clientPersister = createPersister();
    setPersister(clientPersister);
    setIsHydrated(true);

    // Setup online/offline handlers
    const handleOnline = () => {
      console.log('Connection restored - syncing offline mutations');
      backgroundSync.syncOfflineMutations();
    };

    const handleOffline = () => {
      console.log('Connection lost - enabling offline mode');
    };

    // Setup visibility change handler for cache optimization
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Optimize cache when tab becomes hidden
        setTimeout(() => {
          cacheUtils.optimizeCache();
        }, 30000); // 30 seconds delay
      }
    };

    // Setup periodic cache cleanup
    const cacheCleanupInterval = setInterval(() => {
      cacheUtils.optimizeCache();
    }, 1000 * 60 * 15); // Every 15 minutes

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

  // Show loading until hydrated to prevent SSR mismatches
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fixly-bg dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fixly-accent mx-auto mb-4"></div>
          <p className="text-fixly-text-muted dark:text-gray-400">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Use PersistQueryClientProvider if persister is available, otherwise fallback to regular provider
  if (persister) {
    return (
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          hydrateOptions: {
            // Only hydrate queries that are less than 1 hour old
            defaultOptions: {
              queries: {
                gcTime: 1000 * 60 * 60, // 1 hour
              }
            }
          },
          dehydrateOptions: {
            // Don't persist queries with errors or that are currently fetching
            shouldDehydrateQuery: (query) => {
              return query.state.status === 'success' && !query.isFetching();
            }
          }
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

// Wrapper component for React Query Devtools
function QueryDevtoolsWrapper() {
  const [showDevtools, setShowDevtools] = useState(false);

  useEffect(() => {
    // Only show devtools in development and when explicitly enabled
    const shouldShowDevtools = 
      process.env.NODE_ENV === 'development' && 
      localStorage.getItem('fixly-devtools') === 'true';
    
    setShowDevtools(shouldShowDevtools);
  }, []);

  if (!showDevtools) return null;

  return (
    <ReactQueryDevtools
      initialIsOpen={false}
      position="bottom-right"
      toggleButtonProps={{
        style: {
          background: 'rgb(13, 148, 136)', // fixly-accent
          color: 'white'
        }
      }}
    />
  );
}

// Performance monitoring component
export function QueryPerformanceMonitor() {
  useEffect(() => {
    // Monitor query cache size and performance
    const interval = setInterval(() => {
      const stats = cacheUtils.getCacheStats();
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Query Cache Stats:', stats);
        
        // Warn about large cache sizes
        if (stats.totalQueries > 100) {
          console.warn('Large query cache detected:', stats.totalQueries, 'queries');
        }
        
        if (stats.cacheSize > 1024 * 1024) { // 1MB
          console.warn('Large cache size detected:', Math.round(stats.cacheSize / 1024 / 1024), 'MB');
        }
      }
      
      // Auto-optimize if cache gets too large
      if (stats.totalQueries > 200 || stats.cacheSize > 5 * 1024 * 1024) { // 5MB
        console.log('Auto-optimizing query cache due to size...');
        cacheUtils.optimizeCache();
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return null; // This is a monitoring component, no UI
}

// Error boundary specifically for React Query errors
export function QueryErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (event) => {
      // Check if this is a React Query related error
      if (event.error?.message?.includes('query') || event.error?.message?.includes('mutation')) {
        setHasError(true);
        setError(event.error);
        console.error('React Query Error Boundary caught:', event.error);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      handleError({ error: event.reason });
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  if (hasError) {
    if (fallback) {
      return fallback(error, () => {
        setHasError(false);
        setError(null);
        queryClient.clear(); // Clear cache on recovery
      });
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-fixly-bg dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-fixly-text dark:text-gray-100 mb-2">
            Something went wrong with data loading
          </h2>
          <p className="text-fixly-text-muted dark:text-gray-400 mb-6">
            We're having trouble loading your data. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              setHasError(false);
              setError(null);
              queryClient.clear();
              window.location.reload();
            }}
            className="bg-fixly-accent text-white px-6 py-3 rounded-lg hover:bg-fixly-accent-dark transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return children;
}