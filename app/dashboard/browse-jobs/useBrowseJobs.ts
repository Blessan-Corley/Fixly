'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Channels, Events } from '@/lib/ably/events';
import { useAblyChannel } from '@/lib/ably/hooks';
import { useInfiniteBrowseJobs } from '@/lib/queries/jobs';
import { queryKeys } from '@/lib/queries/keys';

import { loadUserLocation, type UserLocation } from '../../../utils/locationUtils';
import { useApp } from '../../providers';

import {
  applyFiltersToJobs,
  buildBrowseQueryFilters,
  buildPaginationState,
} from './browse-jobs.filters';
import {
  DEFAULT_FILTERS,
  type BrowseFilters,
  type BrowseJob,
  type PaginationState,
  type FixerUser,
} from './browse-jobs.types';
import { normalizeFixerUser, normalizeJob } from './browse-jobs.utils';
import { useQuickApply } from './useQuickApply';

export interface UseBrowseJobsResult {
  jobs: BrowseJob[];
  normalizedUser: FixerUser;
  rawUser: ReturnType<typeof useApp>['user'];
  filters: BrowseFilters;
  showFilters: boolean;
  applyingJobs: Set<string>;
  searchLoading: boolean;
  showRefreshMessage: boolean;
  loading: boolean;
  refreshing: boolean;
  pagination: PaginationState;
  userLocation: UserLocation | null;
  locationEnabled: boolean;
  isFetchingNextPage: boolean;
  handleLocationUpdate: (location: UserLocation | null) => void;
  handleFilterChange: <K extends keyof BrowseFilters>(field: K, value: BrowseFilters[K]) => void;
  handleRefresh: () => void;
  handleQuickApply: (jobId: string) => Promise<void>;
  loadMore: () => void;
  clearFilters: () => void;
  setShowFilters: (value: boolean) => void;
}

export function useBrowseJobs(): UseBrowseJobsResult {
  const { user } = useApp();
  const normalizedUser = normalizeFixerUser(user);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(false);
  const [filters, setFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState<boolean>(false);
  const [debouncedFilters, setDebouncedFilters] = useState<BrowseFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const cachedLocation = loadUserLocation();
    if (cachedLocation) {
      setUserLocation(cachedLocation);
      setLocationEnabled(true);
      setFilters((prev) => ({ ...prev, sortBy: 'distance' }));
    }
  }, []);

  const handleLocationUpdate = (location: UserLocation | null): void => {
    setUserLocation(location);
    setLocationEnabled(!!location);
    if (location) {
      setFilters((prev) => ({ ...prev, sortBy: 'distance' }));
    } else {
      setFilters((prev) => ({ ...prev, sortBy: 'newest', maxDistance: null }));
    }
  };

  useEffect(() => {
    setSearchLoading(true);
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setSearchLoading(false);
    }, 500);
    return () => {
      clearTimeout(timer);
      setSearchLoading(false);
    };
  }, [filters]);

  const queryFilters = useMemo(() => buildBrowseQueryFilters(debouncedFilters), [debouncedFilters]);

  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useInfiniteBrowseJobs(queryFilters, { staleTime: 30_000 });

  const rawJobs = useMemo<BrowseJob[]>(() => {
    const pages = Array.isArray(data?.pages) ? data.pages : [];
    return pages
      .flatMap((page) => (Array.isArray(page?.jobs) ? page.jobs : []))
      .map(normalizeJob)
      .filter((job): job is BrowseJob => Boolean(job && job._id));
  }, [data?.pages]);

  const jobs = useMemo<BrowseJob[]>(
    () => applyFiltersToJobs(rawJobs, filters, userLocation, locationEnabled),
    [filters, locationEnabled, rawJobs, userLocation]
  );

  const pagination = useMemo<PaginationState>(
    () => buildPaginationState(data, hasNextPage, jobs.length),
    [data, hasNextPage, jobs.length]
  );

  const loading = isLoading || (isFetching && rawJobs.length === 0);
  const refreshing = isFetching && !isFetchingNextPage && rawJobs.length > 0;

  useAblyChannel(
    Channels.marketplace,
    useCallback(
      (message) => {
        if (
          message.name === Events.marketplace.jobPosted ||
          message.name === Events.marketplace.jobUpdated ||
          message.name === Events.marketplace.jobClosed
        ) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.browse(queryFilters) });
          if (message.name === Events.marketplace.jobPosted) toast('New job posted nearby');
        }
      },
      [queryClient, queryFilters]
    )
  );

  useEffect(() => {
    if (!loading) {
      setShowRefreshMessage(false);
      return;
    }
    const timer = setTimeout(() => setShowRefreshMessage(true), 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleFilterChange = <K extends keyof BrowseFilters>(
    field: K,
    value: BrowseFilters[K]
  ): void => setFilters((prev) => ({ ...prev, [field]: value }));

  const handleRefresh = useCallback((): void => { void refetch(); }, [refetch]);

  const loadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const clearFilters = useCallback((): void => {
    setFilters({
      ...DEFAULT_FILTERS,
      sortBy: locationEnabled ? 'distance' : 'newest',
      maxDistance: null,
    });
  }, [locationEnabled]);

  const { applyingJobs, handleQuickApply } = useQuickApply({
    normalizedUser,
    onNavigate: (path) => router.push(path),
  });

  return {
    jobs,
    normalizedUser,
    rawUser: user,
    filters,
    showFilters,
    applyingJobs,
    searchLoading,
    showRefreshMessage,
    loading,
    refreshing,
    pagination,
    userLocation,
    locationEnabled,
    isFetchingNextPage,
    handleLocationUpdate,
    handleFilterChange,
    handleRefresh,
    handleQuickApply,
    loadMore,
    clearFilters,
    setShowFilters,
  };
}
