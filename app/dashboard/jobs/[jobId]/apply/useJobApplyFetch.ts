'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { JobDetails } from './apply.types';
import {
  getDefaultProposedAmount,
  getResponseMessage,
  isAbortError,
  isRecord,
  normalizeJobDetails,
  parseResponsePayload,
} from './apply.utils';

export type UseJobApplyFetchResult = {
  job: JobDetails | null;
  loading: boolean;
  hasApplied: boolean;
  showRefreshMessage: boolean;
  defaultProposedAmount: string;
  fetchJobAbortRef: React.MutableRefObject<AbortController | null>;
};

type UseJobApplyFetchParams = {
  safeJobId: string;
  userId: string;
  startLoading: (message: string) => void;
  stopLoading: () => void;
};

export function useJobApplyFetch({
  safeJobId,
  userId,
  startLoading,
  stopLoading,
}: UseJobApplyFetchParams): UseJobApplyFetchResult {
  const router = useRouter();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [showRefreshMessage, setShowRefreshMessage] = useState<boolean>(false);
  const [defaultProposedAmount, setDefaultProposedAmount] = useState<string>('');

  const fetchJobAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      fetchJobAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!safeJobId) {
      setLoading(false);
      return;
    }

    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const fetchJob = async (): Promise<void> => {
      setLoading(true);
      setShowRefreshMessage(false);
      startLoading('Loading job details...');
      refreshTimeout = setTimeout(() => setShowRefreshMessage(true), 5000);

      if (fetchJobAbortRef.current) fetchJobAbortRef.current.abort();
      const abortController = new AbortController();
      fetchJobAbortRef.current = abortController;

      try {
        const response = await fetch(`/api/jobs/${safeJobId}?forApplication=true`, {
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;

        const payload = await parseResponsePayload(response);
        if (!response.ok) throw new Error(getResponseMessage(payload, 'Failed to load job details'));

        const jobPayload = isRecord(payload) ? payload.job : undefined;
        const normalizedJob = normalizeJobDetails(jobPayload);
        if (!normalizedJob) throw new Error('Unable to parse job details');

        setJob(normalizedJob);
        setHasApplied(
          normalizedJob.hasApplied || normalizedJob.applications.some((app) => app.fixer === userId)
        );
        setDefaultProposedAmount(getDefaultProposedAmount(normalizedJob.budget));
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load job details');
        setTimeout(() => router.push('/dashboard/browse-jobs'), 2500);
      } finally {
        setLoading(false);
        setShowRefreshMessage(false);
        stopLoading();
        if (refreshTimeout) clearTimeout(refreshTimeout);
      }
    };

    void fetchJob();
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [router, safeJobId, startLoading, stopLoading, userId]);

  return { job, loading, hasApplied, showRefreshMessage, defaultProposedAmount, fetchJobAbortRef };
}
