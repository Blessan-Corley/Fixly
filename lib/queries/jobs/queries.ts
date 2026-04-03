import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';

import { queryKeys } from '../keys';

import {
  fetchBrowseJobs,
  fetchJobApplications,
  fetchJobDetail,
  fetchJobReviews,
  fetchJobs,
  fetchSavedJobs,
} from './fetchers';

type QueryFilters = Record<string, unknown>;

type InfiniteJobsPage = {
  jobs?: unknown[];
  pagination?: {
    page?: number;
    total?: number;
    hasMore?: boolean;
    hasNextPage?: boolean;
  };
  currentPage?: number;
  hasMore?: boolean;
};

type InfiniteBrowseOptions = Omit<
  UseInfiniteQueryOptions<
    InfiniteJobsPage,
    Error,
    InfiniteData<InfiniteJobsPage, number>,
    ReturnType<typeof queryKeys.jobs.browse>,
    number
  >,
  'queryKey' | 'initialPageParam' | 'queryFn' | 'getNextPageParam'
>;

export function useJobs(filters: QueryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: () => fetchJobs(filters),
    staleTime: 30_000,
  });
}

export function useJobDetail(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId),
    queryFn: () => fetchJobDetail(jobId),
    enabled: jobId.length > 0,
    staleTime: 60_000,
  });
}

export function useJobApplications(jobId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.applications(jobId),
    queryFn: () => fetchJobApplications(jobId),
    enabled: jobId.length > 0,
    staleTime: 30_000,
  });
}

export function useJobReviews(jobId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.jobs.reviews(jobId),
    queryFn: () => fetchJobReviews(jobId),
    enabled: enabled && jobId.length > 0,
    staleTime: 30_000,
  });
}

export function useBrowseJobs(filters: QueryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.jobs.browse(filters),
    queryFn: () => fetchBrowseJobs(filters),
    staleTime: 30_000,
  });
}

export function useInfiniteBrowseJobs(
  filters: QueryFilters = {},
  options: InfiniteBrowseOptions = {}
) {
  return useInfiniteQuery({
    queryKey: queryKeys.jobs.browse(filters),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchBrowseJobs({
        ...filters,
        page: pageParam,
        limit: filters.limit ?? 12,
      }),
    getNextPageParam: (lastPage: InfiniteJobsPage) => {
      const pagination =
        lastPage.pagination && typeof lastPage.pagination === 'object'
          ? lastPage.pagination
          : null;
      const currentPage =
        pagination && typeof pagination.page === 'number'
          ? pagination.page
          : typeof lastPage.currentPage === 'number'
            ? lastPage.currentPage
            : 1;
      const hasMore =
        pagination && typeof pagination.hasMore === 'boolean'
          ? pagination.hasMore
          : pagination && typeof pagination.hasNextPage === 'boolean'
            ? pagination.hasNextPage
            : lastPage.hasMore === true;

      return hasMore ? currentPage + 1 : undefined;
    },
    staleTime: 30_000,
    ...options,
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.saved,
    queryFn: fetchSavedJobs,
    staleTime: 60_000,
  });
}
