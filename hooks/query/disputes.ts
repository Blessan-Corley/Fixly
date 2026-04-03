'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, MutationHookOptions, QueryHookOptions, QueryParams } from './shared';

export const useDisputesQuery = (
  filters: QueryParams = {},
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.disputes.list>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.disputes.list(filters),
    queryFn: async () => {
      try {
        const query = toSearchParams(filters);
        const data = await fetcher<BaseEntity>(`/api/disputes?${query.toString()}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    staleTime: 1000 * 30,
    ...queryOptions,
  });
};

export const useDisputeDetailQuery = (
  disputeId?: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.disputes.detail>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.disputes.detail(disputeId ?? ''),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>(`/api/disputes/${disputeId}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(disputeId),
    ...queryOptions,
  });
};

export const useCreateDisputeMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>('/api/disputes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.list() });
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
