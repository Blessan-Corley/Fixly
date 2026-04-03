'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  getCreatedJobId,
  getErrorMessage,
  isAbortError,
  parseResponsePayload,
} from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type { DashboardJob, RepostModalState } from '@/app/dashboard/jobs/_lib/jobs.types';
import type { RepostSubmitData } from '@/components/ui/RepostJobModal';

type UseJobsRepostParams = {
  checkConnection: () => boolean;
  handleNetworkError: (error: unknown) => void;
  fetchJobs: (params: { reset: boolean; page: number }) => Promise<void>;
};

type UseJobsRepostResult = {
  repostModal: RepostModalState;
  openRepostModal: (job: DashboardJob) => void;
  closeRepostModal: () => void;
  handleRepostJob: (formData: RepostSubmitData) => Promise<void>;
};

export function useJobsRepost({
  checkConnection,
  handleNetworkError,
  fetchJobs,
}: UseJobsRepostParams): UseJobsRepostResult {
  const router = useRouter();

  const [repostModal, setRepostModal] = useState<RepostModalState>({
    isOpen: false,
    job: null,
    loading: false,
  });

  const repostAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      repostAbortRef.current?.abort();
    };
  }, []);

  const openRepostModal = useCallback((job: DashboardJob): void => {
    setRepostModal({ isOpen: true, job, loading: false });
  }, []);

  const closeRepostModal = useCallback((): void => {
    setRepostModal({ isOpen: false, job: null, loading: false });
  }, []);

  const handleRepostJob = useCallback(
    async (formData: RepostSubmitData): Promise<void> => {
      if (!checkConnection()) return;

      const sourceJob = repostModal.job;
      if (!sourceJob) {
        toast.error('No job selected to repost');
        return;
      }

      setRepostModal((prev) => ({ ...prev, loading: true }));
      repostAbortRef.current?.abort();
      const abortController = new AbortController();
      repostAbortRef.current = abortController;

      try {
        const response = await fetch('/api/jobs/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: sourceJob.description,
            skillsRequired: sourceJob.skillsRequired,
            experienceLevel: sourceJob.experienceLevel,
            budget: { type: formData.budgetType, amount: formData.budgetAmount },
            location: sourceJob.location,
            urgency: sourceJob.urgency,
            type: sourceJob.type,
            estimatedDuration: sourceJob.estimatedDuration,
            deadline: new Date(formData.deadline).toISOString(),
            scheduledDate: sourceJob.scheduledDate
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : undefined,
          }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        const payload = await parseResponsePayload(response);
        if (!response.ok) {
          toast.error(getErrorMessage(payload, 'Failed to repost job'), {
            style: { background: '#EF4444', color: 'white' },
          });
          return;
        }

        toast.success('Job reposted successfully', {
          style: { background: '#10B981', color: 'white' },
        });

        closeRepostModal();
        await fetchJobs({ reset: true, page: 1 });

        const newJobId = getCreatedJobId(payload);
        if (newJobId) router.push(`/dashboard/jobs/${newJobId}`);
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        handleNetworkError(error);
      } finally {
        setRepostModal((prev) => ({ ...prev, loading: false }));
      }
    },
    [checkConnection, closeRepostModal, fetchJobs, handleNetworkError, repostModal.job, router]
  );

  return { repostModal, openRepostModal, closeRepostModal, handleRepostJob };
}
