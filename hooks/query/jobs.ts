'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { analytics, EventTypes } from '../../lib/analytics-client';
import { queryKeys } from '../../lib/queryKeys';
import { optimisticUpdates, prefetchHelpers } from '../../lib/reactQuery';

import { fetcher, toError, toSearchParams } from './shared';
import type {
  BaseEntity,
  InfiniteQueryHookOptions,
  JobResponse,
  JobsResponse,
  MutationHookOptions,
  QueryHookOptions,
  QueryParams,
  SessionUser,
} from './shared';
import {
  type ApplyMutateContext,
  type ApplyPayload,
  getCurrentPage,
  getHasMore,
  getMutationJobId,
} from './jobs.helpers';

export const useJobs = (
  filters: QueryParams = {},
  options: QueryHookOptions<JobsResponse, ReturnType<typeof queryKeys.jobs.list>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async () => {
      try {
        const data = await fetcher<JobsResponse>(
          `/api/jobs/browse?${toSearchParams(filters).toString()}`
        );
        analytics.trackEvent(EventTypes.SEARCH, {
          filters,
          resultCount: data?.jobs?.length || 0,
          userId: user?.id,
        });
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 2,
    ...queryOptions,
  });
};

export const useInfiniteJobs = (
  filters: QueryParams = {},
  options: InfiniteQueryHookOptions<JobsResponse, ReturnType<typeof queryKeys.jobs.list>> = {}
) => {
  const { onSuccess, onError, getNextPageParam, ...queryOptions } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) => {
      const params = toSearchParams({
        ...filters,
        page: pageParam,
        limit: '10',
      });
      return fetcher<JobsResponse>(`/api/jobs/browse?${params.toString()}`)
        .then((data) => {
          onSuccess?.(data);
          return data;
        })
        .catch((error: unknown) => {
          const normalizedError = toError(error);
          onError?.(normalizedError);
          throw normalizedError;
        });
    },
    initialPageParam: 1,
    getNextPageParam:
      getNextPageParam ||
      ((lastPage: JobsResponse) => {
        return getHasMore(lastPage) ? getCurrentPage(lastPage) + 1 : undefined;
      }),
    ...queryOptions,
  });
};

export const useJob = (
  jobId?: string,
  options: QueryHookOptions<JobResponse, ReturnType<typeof queryKeys.jobs.detail>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId ?? ''),
    queryFn: async () => {
      try {
        const data = await fetcher<JobResponse>(`/api/jobs/${jobId}`);
        analytics.trackEvent(EventTypes.JOB_INTERACTION, {
          jobId,
          userId: user?.id,
          jobTitle: data?.title,
          jobCategory: data?.category,
        });
        prefetchHelpers.prefetchRelatedJobs(data);
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(jobId),
    staleTime: 1000 * 60 * 5,
    ...queryOptions,
  });
};

export const useCreateJob = (
  options: MutationHookOptions<JobResponse, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (jobData: Record<string, unknown>) =>
      fetcher<JobResponse>('/api/jobs/post', {
        method: 'POST',
        body: JSON.stringify(jobData),
      }),
    onSuccess: (data: JobResponse, variables: Record<string, unknown>) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });

      const createdJobId = getMutationJobId(data);

      analytics.trackEvent(EventTypes.JOB_INTERACTION, {
        jobId: createdJobId,
        userId: user?.id,
        jobTitle: data?.title,
        budget: data?.budget?.amount,
      });

      toast.success('Job posted successfully!');
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: Record<string, unknown>) => {
      toast.error(error.message || 'Failed to create job');
      onError?.(error, variables);
    },
    ...mutationOptions,
  });
};

export const useBrowseJobsQuery = (
  filters: QueryParams = {},
  options: QueryHookOptions<JobsResponse, ReturnType<typeof queryKeys.jobs.browse>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.jobs.browse(filters),
    queryFn: async () => {
      try {
        const data = await fetcher<JobsResponse>(
          `/api/jobs/browse?${toSearchParams(filters).toString()}`
        );
        analytics.trackEvent(EventTypes.SEARCH, {
          filters,
          resultCount: data?.jobs?.length || 0,
          userId: user?.id,
        });
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

export const useApplyToJob = (
  options: MutationHookOptions<BaseEntity, ApplyPayload, ApplyMutateContext> = {}
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, onMutate, ...mutationOptions } = options;

  return useMutation({
    mutationFn: ({ jobId, applicationData }: ApplyPayload) =>
      fetcher<BaseEntity>(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify(applicationData),
      }),
    onMutate: async ({ jobId, applicationData }: ApplyPayload) => {
      const optimisticApplication = {
        _id: `temp_${Date.now()}`,
        fixer: session?.user,
        message: applicationData.message,
        bidAmount: applicationData.bidAmount,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      optimisticUpdates.applyToJob(jobId, optimisticApplication);
      const externalContext = await onMutate?.({ jobId, applicationData });
      return externalContext ?? { jobId, optimisticApplication };
    },
    onSuccess: (
      data: BaseEntity,
      variables: ApplyPayload,
      context: ApplyMutateContext | undefined
    ) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });

      analytics.trackEvent(EventTypes.JOB_INTERACTION, {
        jobId: variables.jobId,
        userId: user?.id,
        bidAmount: variables.applicationData.bidAmount,
      });

      toast.success('Application submitted successfully!');
      onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: ApplyPayload, context: ApplyMutateContext | undefined) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });
      toast.error(error.message || 'Failed to submit application');
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
