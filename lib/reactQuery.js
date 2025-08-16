// lib/reactQuery.js - React Query configuration for advanced caching and performance
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { analytics, EventTypes } from './analytics';

// Custom error handler for React Query
const errorHandler = (error, query) => {
  // Log error for analytics
  analytics.trackEvent(EventTypes.API_ERROR, {
    queryKey: query?.queryKey,
    errorMessage: error?.message,
    errorCode: error?.code || 'UNKNOWN',
    url: error?.config?.url
  });

  // Show user-friendly error messages
  const errorMessage = error?.response?.data?.message || 
                      error?.message || 
                      'An unexpected error occurred';

  // Don't show toast for certain background queries
  const backgroundQueries = ['notifications', 'realtime-updates', 'analytics'];
  const isBackgroundQuery = query?.queryKey?.some(key => 
    backgroundQueries.some(bg => String(key).includes(bg))
  );

  if (!isBackgroundQuery) {
    toast.error(errorMessage);
  }

  console.error('React Query Error:', {
    error,
    queryKey: query?.queryKey,
    timestamp: new Date().toISOString()
  });
};

// Custom success handler for mutations
const successHandler = (data, variables, context, mutation) => {
  // Track successful mutations
  analytics.trackEvent(EventTypes.USER_ACTION, {
    mutationKey: mutation?.options?.mutationKey,
    action: 'mutation_success',
    variables: variables
  });
};

// Create Query Cache with error handling
const queryCache = new QueryCache({
  onError: errorHandler
});

// Create Mutation Cache with success/error handling
const mutationCache = new MutationCache({
  onSuccess: successHandler,
  onError: (error, variables, context, mutation) => {
    analytics.trackEvent(EventTypes.API_ERROR, {
      mutationKey: mutation?.options?.mutationKey,
      action: 'mutation_error',
      errorMessage: error?.message,
      variables: variables
    });

    const errorMessage = error?.response?.data?.message || 
                        error?.message || 
                        'Operation failed';
    toast.error(errorMessage);
  }
});

// Create the React Query client with optimized settings
export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // Caching strategy
      staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache garbage collection
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry for certain error types
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Network mode - handle offline scenarios
      networkMode: 'online',
      
      // Error handling
      throwOnError: false,
      
      // Performance optimizations
      structuralSharing: true, // Prevent unnecessary re-renders
      
      // Experimental features
      experimental_prefetchInRender: true
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      
      // Network mode
      networkMode: 'online',
      
      // Error handling
      throwOnError: false
    }
  }
});

// Query key factories for consistent cache management
export const queryKeys = {
  // User queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
    settings: (id: string) => [...queryKeys.users.all, 'settings', id] as const
  },
  
  // Job queries
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.jobs.lists(), { filters }] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    applications: (jobId: string) => [...queryKeys.jobs.detail(jobId), 'applications'] as const,
    comments: (jobId: string) => [...queryKeys.jobs.detail(jobId), 'comments'] as const
  },
  
  // Search queries
  search: {
    all: ['search'] as const,
    results: (query: string, filters: any) => [...queryKeys.search.all, 'results', { query, filters }] as const,
    suggestions: (query: string) => [...queryKeys.search.all, 'suggestions', query] as const,
    location: (coordinates: any) => [...queryKeys.search.all, 'location', coordinates] as const
  },
  
  // Admin queries
  admin: {
    all: ['admin'] as const,
    dashboard: (range: string) => [...queryKeys.admin.all, 'dashboard', range] as const,
    users: (filters: any) => [...queryKeys.admin.all, 'users', filters] as const,
    jobs: (filters: any) => [...queryKeys.admin.all, 'jobs', filters] as const,
    analytics: (timeRange: string) => [...queryKeys.admin.all, 'analytics', timeRange] as const
  },
  
  // Real-time queries
  realtime: {
    all: ['realtime'] as const,
    notifications: (userId: string) => [...queryKeys.realtime.all, 'notifications', userId] as const,
    messages: (conversationId: string) => [...queryKeys.realtime.all, 'messages', conversationId] as const,
    activity: () => [...queryKeys.realtime.all, 'activity'] as const
  }
};

// Custom hooks for common query patterns
export const useInfiniteQuery = (queryKey: any[], queryFn: any, options = {}) => {
  return queryClient.useInfiniteQuery({
    queryKey,
    queryFn,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage?.hasMore) {
        return allPages.length + 1;
      }
      return undefined;
    },
    getPreviousPageParam: (firstPage, allPages) => {
      return allPages.length > 1 ? allPages.length - 1 : undefined;
    },
    maxPages: 10, // Prevent memory issues
    ...options
  });
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Add optimistic update for job applications
  applyToJob: (jobId: string, application: any) => {
    queryClient.setQueryData(
      queryKeys.jobs.detail(jobId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          applications: [...(oldData.applications || []), application],
          applicationCount: (oldData.applicationCount || 0) + 1
        };
      }
    );
  },
  
  // Add optimistic update for comments
  addComment: (jobId: string, comment: any) => {
    queryClient.setQueryData(
      queryKeys.jobs.comments(jobId),
      (oldData: any) => {
        if (!oldData) return [comment];
        return [comment, ...oldData];
      }
    );
  },
  
  // Update user profile optimistically
  updateProfile: (userId: string, updates: any) => {
    queryClient.setQueryData(
      queryKeys.users.profile(userId),
      (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, ...updates };
      }
    );
  }
};

// Prefetching utilities
export const prefetchHelpers = {
  // Prefetch related jobs when viewing a job
  prefetchRelatedJobs: async (currentJob: any) => {
    const relatedFilters = {
      skills: currentJob.skillsRequired?.slice(0, 3),
      location: currentJob.location,
      exclude: currentJob._id
    };
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.list(relatedFilters),
      queryFn: () => fetch(`/api/jobs?${new URLSearchParams(relatedFilters)}`).then(res => res.json()),
      staleTime: 1000 * 60 * 10 // 10 minutes
    });
  },
  
  // Prefetch user profile when hovering over user link
  prefetchUserProfile: async (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.profile(userId),
      queryFn: () => fetch(`/api/users/${userId}/profile`).then(res => res.json()),
      staleTime: 1000 * 60 * 15 // 15 minutes
    });
  },
  
  // Prefetch search suggestions
  prefetchSearchSuggestions: async (query: string) => {
    if (query.length >= 2) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.search.suggestions(query),
        queryFn: () => fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`).then(res => res.json()),
        staleTime: 1000 * 60 * 5 // 5 minutes
      });
    }
  }
};

// Background sync for real-time data
export const backgroundSync = {
  // Start background polling for notifications
  startNotificationSync: (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.realtime.notifications(userId),
      refetchInterval: 30000 // 30 seconds
    });
  },
  
  // Sync offline mutations when back online
  syncOfflineMutations: async () => {
    try {
      // Resume paused mutations
      await queryClient.resumePausedMutations();
      
      // Refetch active queries
      await queryClient.refetchQueries({
        type: 'active'
      });
      
      analytics.trackEvent(EventTypes.USER_ACTION, {
        action: 'offline_sync_completed'
      });
    } catch (error) {
      console.error('Failed to sync offline mutations:', error);
    }
  }
};

// Cache management utilities
export const cacheUtils = {
  // Clear all caches
  clearAll: () => {
    queryClient.clear();
    localStorage.removeItem('react-query-offline-cache');
  },
  
  // Clear specific cache patterns
  clearUserData: (userId: string) => {
    queryClient.removeQueries({
      queryKey: queryKeys.users.detail(userId)
    });
    queryClient.removeQueries({
      queryKey: queryKeys.users.profile(userId)
    });
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(query => query.isStale()).length,
      fetchingQueries: queries.filter(query => query.isFetching()).length,
      errorQueries: queries.filter(query => query.state.status === 'error').length,
      cacheSize: JSON.stringify(queries).length
    };
  },
  
  // Optimize cache size
  optimizeCache: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove old error queries
    queries
      .filter(query => 
        query.state.status === 'error' && 
        Date.now() - query.state.dataUpdatedAt > 1000 * 60 * 5 // 5 minutes old
      )
      .forEach(query => cache.remove(query));
    
    // Force garbage collection for old unused queries
    queryClient.getQueryCache().clear();
  }
};

// Performance monitoring
export const performanceMonitor = {
  // Monitor query performance
  trackQueryPerformance: (queryKey: any[], startTime: number) => {
    const duration = Date.now() - startTime;
    
    analytics.trackEvent(EventTypes.API_ERROR, {
      queryKey: queryKey.join('_'),
      duration,
      performance: 'query_timing'
    });
    
    // Log slow queries
    if (duration > 3000) { // 3 seconds
      console.warn('Slow query detected:', {
        queryKey,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Monitor cache hit rates
  trackCacheHitRate: () => {
    const stats = cacheUtils.getCacheStats();
    
    analytics.trackEvent(EventTypes.USER_ACTION, {
      action: 'cache_stats',
      ...stats
    });
  }
};

// Export configured client and utilities
export default queryClient;