'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { analytics, EventTypes } from '../../lib/analytics-client';
import { queryKeys } from '../../lib/queryKeys';
import { prefetchHelpers } from '../../lib/reactQuery';

import { getCurrentPage, getHasMore } from './jobs.helpers';
import { fetcher, toError, toSearchParams } from './shared';
import type {
  InfiniteQueryHookOptions,
  JobResponse,
  JobsResponse,
  QueryHookOptions,
  QueryParams,
  SessionUser,
} from './shared';

export { useCreateJob, useApplyToJob } from './jobs.mutations';

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
    staleTime: 1000 * 30,
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
    staleTime: 1000 * 60,
    ...queryOptions,
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

