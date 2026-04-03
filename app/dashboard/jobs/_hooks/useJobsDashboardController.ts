'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getJobsPosted, getPlanType } from '@/app/dashboard/jobs/_lib/jobs.helpers';
import {
  DEFAULT_FILTERS,
  type FilterState,
  type JobsDashboardController,
  type TabStatus,
} from '@/app/dashboard/jobs/_lib/jobs.types';
import { useApp } from '@/app/providers';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePageLoading } from '@/hooks/usePageLoading';

import { useJobsDelete } from './useJobsDelete';
import { useJobsFetch } from './useJobsFetch';
import { useJobsRealtime } from './useJobsRealtime';
import { useJobsRepost } from './useJobsRepost';

export function useJobsDashboardController(): JobsDashboardController {
  const { user } = useApp();
  const router = useRouter();
  const {
    loading: pageLoading,
    showRefreshMessage,
    startLoading,
    stopLoading,
    handleNetworkError,
  } = usePageLoading('jobs');
  const { isOnline, checkConnection } = useNetworkStatus();

  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.status === activeTab) return prev;
      return { ...prev, status: activeTab };
    });
  }, [activeTab]);

  const { jobs, setJobs, loading, pagination, setPagination, earnings, fetchJobs } = useJobsFetch({
    filters,
    activeTab,
    checkConnection,
    startLoading,
    stopLoading,
    handleNetworkError,
  });

  const { deleteModal, openDeleteModal, closeDeleteModal, handleDeleteJob } = useJobsDelete({
    checkConnection,
    handleNetworkError,
    setJobs,
    setPagination,
  });

  const { repostModal, openRepostModal, closeRepostModal, handleRepostJob } = useJobsRepost({
    checkConnection,
    handleNetworkError,
    fetchJobs,
  });

  useJobsRealtime({ jobs, setJobs, fetchJobs });

  const loadMore = useCallback((): void => {
    if (!pagination.hasMore || loading) return;
    void fetchJobs({ reset: false, page: pagination.page + 1 });
  }, [fetchJobs, loading, pagination.hasMore, pagination.page]);

  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(field: K, value: FilterState[K]): void => {
      setFilters((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const clearFilters = useCallback((): void => {
    setActiveTab('all');
    setFilters(DEFAULT_FILTERS);
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<TabStatus, number> = {
      all: pagination.total,
      open: 0,
      in_progress: 0,
      completed: 0,
      expired: 0,
      cancelled: 0,
    };

    jobs.forEach((job) => {
      if (job.status === 'open') counts.open += 1;
      if (job.status === 'in_progress') counts.in_progress += 1;
      if (job.status === 'completed') counts.completed += 1;
      if (job.status === 'expired') counts.expired += 1;
      if (job.status === 'cancelled') counts.cancelled += 1;
    });

    return counts;
  }, [jobs, pagination.total]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.status !== 'all') count += 1;
    return count;
  }, [filters.search, filters.status]);

  return {
    jobs,
    loading,
    pagination,
    activeTab,
    setActiveTab,
    filters,
    showFilters,
    setShowFilters,
    earnings,
    deleteModal,
    repostModal,
    isProUser: getPlanType(user) === 'pro',
    jobsPosted: getJobsPosted(user),
    isOnline,
    pageLoading,
    showRefreshMessage,
    tabCounts,
    activeFilterCount,
    handleFilterChange,
    clearFilters,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteJob,
    openRepostModal,
    closeRepostModal,
    handleRepostJob,
    loadMore,
    goToSubscription: () => router.push('/dashboard/subscription'),
    goToPostJob: () => router.push('/dashboard/post-job'),
    viewJob: (jobId: string) => router.push(`/dashboard/jobs/${jobId}`),
    editJob: (jobId: string) => router.push(`/dashboard/jobs/${jobId}/edit`),
  };
}
