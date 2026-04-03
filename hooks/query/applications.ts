'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, MutationHookOptions, QueryHookOptions, QueryParams } from './shared';

export const useFixerApplicationsQuery = (
  filters: QueryParams = {},
  options: QueryHookOptions<BaseEntity, readonly ['users', 'applications', QueryParams]> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.users.applications(), filters] as const,
    queryFn: async () => {
      try {
        const query = toSearchParams(filters);
        const data = await fetcher<BaseEntity>(`/api/fixer/applications?${query.toString()}`);
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

export const useApplyToJobMutation = (
  jobId: string,
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.applications() });
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

type WithdrawPayload = {
  jobId: string;
  reason?: string;
};

export const useWithdrawApplicationMutation = (
  options: MutationHookOptions<BaseEntity, WithdrawPayload> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: ({ jobId, reason }) =>
      fetcher<BaseEntity>(`/api/jobs/${jobId}/applications/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (data, variables, context) => {
      const jobId = typeof variables.jobId === 'string' ? variables.jobId : '';
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.applications() });
      if (jobId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.applications(jobId) });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
