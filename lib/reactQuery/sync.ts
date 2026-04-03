import { analytics, EventTypes } from '../analytics-client';
import { queryKeys } from '../queryKeys';

import { queryClient } from './client';

export const backgroundSync = {
  startNotificationSync: (userId?: string): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.realtime.notifications(userId),
    });
  },

  syncOfflineMutations: async (): Promise<void> => {
    try {
      await queryClient.resumePausedMutations();
      await queryClient.refetchQueries({ type: 'active' });

      void analytics.trackEvent(EventTypes.USER_ACTION, {
        action: 'offline_sync_completed',
      });
    } catch (error: unknown) {
      console.error('Failed to sync offline mutations:', error);
    }
  },
};

export const cacheUtils = {
  clearAll: (): void => {
    queryClient.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('react-query-offline-cache');
    }
  },

  clearUserData: (userId: string): void => {
    queryClient.removeQueries({ queryKey: queryKeys.users.detail(userId) });
    queryClient.removeQueries({ queryKey: queryKeys.users.profile(userId) });
  },

  getCacheStats: (): {
    totalQueries: number;
    staleQueries: number;
    fetchingQueries: number;
    errorQueries: number;
    cacheSize: number;
  } => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const serialized = queries.map((query) => ({
      queryKey: query.queryKey,
      status: query.state.status,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }));

    return {
      totalQueries: queries.length,
      staleQueries: queries.filter((query) => query.isStale()).length,
      fetchingQueries: queries.filter((query) => query.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter((query) => query.state.status === 'error').length,
      cacheSize: JSON.stringify(serialized).length,
    };
  },

  optimizeCache: (): void => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const now = Date.now();

    queries
      .filter(
        (query) =>
          query.state.status === 'error' && now - query.state.dataUpdatedAt > 1000 * 60 * 5
      )
      .forEach((query) => cache.remove(query));

    queries
      .filter((query) => {
        const hasObservers = query.getObserversCount() > 0;
        return (
          query.isStale() && !hasObservers && now - query.state.dataUpdatedAt > 1000 * 60 * 30
        );
      })
      .forEach((query) => cache.remove(query));
  },
};
