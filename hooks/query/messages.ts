'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, MutationHookOptions, QueryHookOptions } from './shared';

export const useConversationsQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.messages.conversations>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.messages.conversations(),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/messages/conversations');
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

export const useMessageThreadQuery = (
  conversationId?: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.messages.thread>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.messages.thread(conversationId ?? ''),
    queryFn: async () => {
      try {
        const params = toSearchParams({ page: 1, limit: 30 });
        const data = await fetcher<BaseEntity>(
          `/api/messages/conversations/${conversationId}?${params.toString()}`
        );
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(conversationId),
    ...queryOptions,
  });
};

export const useJobMessageThreadQuery = (
  jobId?: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.messages.jobThread>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.messages.jobThread(jobId ?? ''),
    queryFn: async () => {
      try {
        const params = toSearchParams({ page: 1, limit: 30 });
        const data = await fetcher<BaseEntity>(`/api/messages/job/${jobId}?${params.toString()}`);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(jobId),
    ...queryOptions,
  });
};

export const useSendMessageMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>('/api/messages', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      const jobId = typeof variables.jobId === 'string' ? variables.jobId : '';
      const conversationId =
        typeof variables.conversationId === 'string' ? variables.conversationId : '';
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations() });
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages.thread(conversationId) });
      }
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages.jobThread(jobId) });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

export const useMessageReactionMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>('/api/messages/reactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
