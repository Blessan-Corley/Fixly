'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import {
  fetchApplicationsRequest,
  fetchCommentsRequest,
  fetchJobDetailsRequest,
  trackJobViewRequest,
} from './page.api';
import type { DashboardUser, JobApplication, JobComment, JobDetails } from './page.types';
import type { JobDetailsAbortRefs } from './useJobDetailsController.types';
import { isAbortError, prepareAbortController } from './useJobDetailsController.utils';

type CreateJobDetailsLoadersParams = {
  abortRefs: JobDetailsAbortRefs;
  jobId: string;
  router: AppRouterInstance;
  setApplications: Dispatch<SetStateAction<JobApplication[]>>;
  setComments: Dispatch<SetStateAction<JobComment[]>>;
  setJob: Dispatch<SetStateAction<JobDetails | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  user: DashboardUser | null;
};

type JobDetailsLoaders = {
  fetchApplications: () => Promise<void>;
  fetchComments: () => Promise<void>;
  fetchJobDetails: () => Promise<void>;
  trackJobView: () => Promise<void>;
};

export const createJobDetailsLoaders = ({
  abortRefs,
  jobId,
  router,
  setApplications,
  setComments,
  setJob,
  setLoading,
  user,
}: CreateJobDetailsLoadersParams): JobDetailsLoaders => {
  const fetchApplications = async (): Promise<void> => {
    try {
      const abortController = prepareAbortController(abortRefs.fetchApplicationsAbortRef);
      const { ok, data } = await fetchApplicationsRequest(jobId, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      if (ok) {
        setApplications(data.applications ?? []);
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      console.error('Error fetching applications:', error);
    }
  };

  const fetchComments = async (): Promise<void> => {
    try {
      const abortController = prepareAbortController(abortRefs.fetchCommentsAbortRef);
      const { ok, data } = await fetchCommentsRequest(jobId, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      if (ok) {
        setComments(data.comments ?? []);
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      console.error('Error fetching comments:', error);
    }
  };

  const fetchJobDetails = async (): Promise<void> => {
    try {
      setLoading(true);

      const abortController = prepareAbortController(abortRefs.fetchJobAbortRef);
      const { ok, data } = await fetchJobDetailsRequest(jobId, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }

      if (ok && data.job) {
        setJob(data.job);

        if (data.job.canMessage || user?.role === 'hirer') {
          void fetchApplications();
        }

        void fetchComments();
        return;
      }

      toast.error('Unable to load job');
      router.push('/dashboard');
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      console.error('Error fetching job:', error);
      toast.error('Connection error');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const trackJobView = async (): Promise<void> => {
    try {
      const abortController = prepareAbortController(abortRefs.trackViewAbortRef);
      await trackJobViewRequest(jobId, abortController.signal);

      if (abortController.signal.aborted) {
        return;
      }
    } catch (error: unknown) {
      if (isAbortError(error)) {
        return;
      }

      console.error('Error tracking view:', error);
    }
  };

  return {
    fetchApplications,
    fetchComments,
    fetchJobDetails,
    trackJobView,
  };
};
