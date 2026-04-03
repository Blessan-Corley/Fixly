'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError } from './shared';
import type { BaseEntity, QueryHookOptions } from './shared';

export const useDashboardStatsQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.dashboard.stats>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/dashboard/stats');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 60,
    ...queryOptions,
  });
};

export const useRecentJobsQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.dashboard.recentJobs>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.dashboard.recentJobs(),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/dashboard/recent-jobs');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 60,
    ...queryOptions,
  });
};
