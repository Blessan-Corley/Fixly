'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  getErrorMessage,
  isAbortError,
  normalizeEarnings,
  normalizeJobs,
  normalizePagination,
  parseResponsePayload,
} from '@/app/dashboard/jobs/_lib/jobs.helpers';
import {
  DEFAULT_EARNINGS,
  DEFAULT_PAGINATION,
  type DashboardJob,
  type EarningsPayload,
  type EarningsState,
  type FilterState,
  type JobsPostPayload,
  type PaginationState,
  type TabStatus,
} from '@/app/dashboard/jobs/_lib/jobs.types';

type UseJobsFetchParams = {
  filters: FilterState;
  activeTab: TabStatus;
  checkConnection: () => boolean;
  startLoading: (message: string) => void;
  stopLoading: () => void;
  handleNetworkError: (error: unknown) => void;
};

type UseJobsFetchResult = {
  jobs: DashboardJob[];
  setJobs: React.Dispatch<React.SetStateAction<DashboardJob[]>>;
  loading: boolean;
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  earnings: EarningsState;
  fetchJobs: (params: { reset: boolean; page: number }) => Promise<void>;
};

export function useJobsFetch({
  filters,
  activeTab,
  checkConnection,
  startLoading,
  stopLoading,
  handleNetworkError,
}: UseJobsFetchParams): UseJobsFetchResult {
  const [jobs, setJobs] = useState<DashboardJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<PaginationState>(DEFAULT_PAGINATION);
  const [earnings, setEarnings] = useState<EarningsState>(DEFAULT_EARNINGS);

  const jobsAbortRef = useRef<AbortController | null>(null);
  const earningsAbortRef = useRef<AbortController | null>(null);

  const fetchJobs = useCallback(
    async ({ reset, page }: { reset: boolean; page: number }): Promise<void> => {
      if (!checkConnection()) return;

      jobsAbortRef.current?.abort();
      const abortController = new AbortController();
      jobsAbortRef.current = abortController;

      try {
        setLoading(true);
        if (reset) startLoading('Loading jobs...');

        const params = new URLSearchParams({
          page: String(page),
          limit: String(DEFAULT_PAGINATION.limit),
        });

        if (filters.status !== 'all') params.set('status', filters.status);
        if (filters.search.trim()) params.set('search', filters.search.trim());

        const response = await fetch(`/api/jobs/post?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const payload = (await parseResponsePayload(response)) as JobsPostPayload | null;
        const jobsPayload = normalizeJobs(payload?.jobs);
        const paginationPayload = normalizePagination(payload?.pagination, page);

        if (!response.ok) {
          toast.error(getErrorMessage(payload, 'Failed to fetch jobs'));
          return;
        }

        setJobs((prev) => (reset ? jobsPayload : [...prev, ...jobsPayload]));
        setPagination(paginationPayload);
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        handleNetworkError(error);
      } finally {
        setLoading(false);
        stopLoading();
      }
    },
    [checkConnection, filters.search, filters.status, handleNetworkError, startLoading, stopLoading]
  );

  const fetchEarnings = useCallback(async (): Promise<void> => {
    earningsAbortRef.current?.abort();
    const abortController = new AbortController();
    earningsAbortRef.current = abortController;

    try {
      const response = await fetch('/api/user/earnings', { signal: abortController.signal });
      if (abortController.signal.aborted) return;

      const payload = (await parseResponsePayload(response)) as EarningsPayload | null;
      if (!response.ok) return;

      setEarnings(normalizeEarnings(payload?.earnings));
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error fetching earnings:', error);
    }
  }, []);

  useEffect(() => {
    void fetchJobs({ reset: true, page: 1 });
  }, [fetchJobs]);

  useEffect(() => {
    if (activeTab === 'completed') void fetchEarnings();
  }, [activeTab, fetchEarnings]);

  useEffect(() => {
    return () => {
      jobsAbortRef.current?.abort();
      earningsAbortRef.current?.abort();
    };
  }, []);

  return { jobs, setJobs, loading, pagination, setPagination, earnings, fetchJobs };
}
