'use client';

import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '../../lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, QueryHookOptions } from './shared';

export const useUser = (
  userId?: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.detail>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.detail(userId ?? ''),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>(`/api/user/profile/${userId}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 10,
    ...queryOptions,
  });
};

export const useUserProfileQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.profile>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.profile('self'),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/user/profile');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 60 * 5,
    ...queryOptions,
  });
};

export const useUserProfile = (
  userId?: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.profile>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.profile(userId ?? ''),
    queryFn: async () => {
      try {
        const path = userId ? `/api/user/profile/${userId}` : '/api/user/profile';
        const data = await fetcher<BaseEntity>(path);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 15,
    ...queryOptions,
  });
};

export const useUserEarningsQuery = (
  period = 'month',
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.earnings>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.earnings(period),
    queryFn: async () => {
      try {
        const query = toSearchParams({ details: 1, period });
        const data = await fetcher<BaseEntity>(`/api/user/earnings?${query.toString()}`);
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

export const useFixerSettingsQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.fixerSettings>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.fixerSettings(),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/user/fixer-settings');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    ...queryOptions,
  });
};
