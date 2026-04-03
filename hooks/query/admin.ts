'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { queryKeys } from '../../lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, QueryHookOptions, QueryParams, SessionUser } from './shared';

export const useAdminMetricsQuery = (
  range = '30d',
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.admin.dashboard>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.admin.dashboard(range),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>(`/api/admin/dashboard?range=${range}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(user?.isAdmin || user?.role === 'admin'),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...queryOptions,
  });
};

export const useAdminDashboard = useAdminMetricsQuery;

export const useAdminStatsQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.admin.stats>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/admin/stats');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(user?.isAdmin || user?.role === 'admin'),
    staleTime: 1000 * 60 * 5,
    ...queryOptions,
  });
};

export const useAdminUsers = (
  filters: QueryParams = {},
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.admin.users>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>(
          `/api/admin/users?${toSearchParams(filters).toString()}`
        );
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(user?.isAdmin || user?.role === 'admin'),
    staleTime: 1000 * 60 * 3,
    ...queryOptions,
  });
};

export const useAdminJobs = (
  filters: QueryParams = {},
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.admin.jobs>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.admin.jobs(filters),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>(
          `/api/admin/jobs?${toSearchParams(filters).toString()}`
        );
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(user?.isAdmin || user?.role === 'admin'),
    staleTime: 1000 * 60 * 3,
    ...queryOptions,
  });
};

export const useAnalytics = (
  timeRange = '30d',
  eventType?: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.admin.analytics>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.admin.analytics(timeRange),
    queryFn: async () => {
      try {
        const params = toSearchParams({
          timeRange,
          eventType,
        });
        const data = await fetcher<BaseEntity>(`/api/admin/analytics?${params.toString()}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(user?.isAdmin || user?.role === 'admin'),
    staleTime: 1000 * 60 * 5,
    ...queryOptions,
  });
};

export const useAdminAnalyticsQuery = useAnalytics;

export const useRefreshAdminMetricsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return fetcher<BaseEntity>('/api/admin/dashboard?refresh=true');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() }),
      ]);
    },
  });
};
