'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, MutationHookOptions, QueryHookOptions, QueryParams } from './shared';

export const useNotificationsQuery = (
  filters: QueryParams = {},
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.notifications>> = {}
) => {
  const { data: session } = useSession();
  const sessionUserId = typeof session?.user?.id === 'string' ? session.user.id : '';
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.notifications(sessionUserId || 'self'),
    queryFn: async () => {
      try {
        const query = toSearchParams(filters);
        const data = await fetcher<BaseEntity>(`/api/user/notifications?${query.toString()}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 15,
    ...queryOptions,
  });
};

export const useMarkNotificationReadMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const sessionUserId = typeof session?.user?.id === 'string' ? session.user.id : 'self';
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>('/api/user/notifications/read', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.notifications(sessionUserId) });
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

export const useNotificationPreferencesQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.users.settings>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.users.settings('notification-preferences'),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/user/notification-preferences');
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

export const useUpdateNotificationPreferencesMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>('/api/user/notification-preferences', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.settings('notification-preferences'),
      });
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
