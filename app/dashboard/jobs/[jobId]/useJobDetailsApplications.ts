'use client';

import { useRouter } from 'next/navigation';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { canApplyToJob } from '@/utils/creditUtils';

import {
  submitDetailedApplicationRequest,
  submitQuickApplicationRequest,
  updateJobActionRequest,
} from './page.api';
import type { JobApplicationFormData } from './page.helpers';
import type { DashboardUser, JobDetails } from './page.types';
import {
  isAbortError,
  prepareAbortController,
  resetUserCreditsView,
} from './useJobDetailsController.utils';

type UseJobDetailsApplicationsParams = {
  jobId: string;
  user: DashboardUser | null;
  job: JobDetails | null;
  applicationData: JobApplicationFormData;
  submitApplicationAbortRef: MutableRefObject<AbortController | null>;
  assignApplicationAbortRef: MutableRefObject<AbortController | null>;
  updateApplicationStatusAbortRef: MutableRefObject<AbortController | null>;
  setJob: Dispatch<SetStateAction<JobDetails | null>>;
  setApplying: Dispatch<SetStateAction<boolean>>;
  setShowApplicationModal: Dispatch<SetStateAction<boolean>>;
  setShowConfirmModal: Dispatch<SetStateAction<boolean>>;
  refreshApplications: () => void;
};

type UseJobDetailsApplicationsResult = {
  handleQuickApply: () => Promise<void>;
  confirmApplication: () => Promise<void>;
  handleDetailedApplication: () => Promise<void>;
  handleAcceptApplication: (applicationId: string) => Promise<void>;
  handleRejectApplication: (applicationId: string) => Promise<void>;
};

export function useJobDetailsApplications({
  jobId,
  user,
  job,
  applicationData,
  submitApplicationAbortRef,
  assignApplicationAbortRef,
  updateApplicationStatusAbortRef,
  setJob,
  setApplying,
  setShowApplicationModal,
  setShowConfirmModal,
  refreshApplications,
}: UseJobDetailsApplicationsParams): UseJobDetailsApplicationsResult {
  const router = useRouter();

  const handleQuickApply = useCallback(async (): Promise<void> => {
    if (!canApplyToJob(user)) {
      toast.error('Free applications used up - Upgrade to Pro');
      router.push('/dashboard/subscription');
      return;
    }
    setShowConfirmModal(true);
  }, [user, router, setShowConfirmModal]);

  const confirmApplication = useCallback(async (): Promise<void> => {
    if (!job) {
      toast.error('Job details not available');
      return;
    }

    setApplying(true);
    setShowConfirmModal(false);

    try {
      const defaultAmount = job.budget.type === 'negotiable' ? 1000 : (job.budget.amount ?? 1000);
      const abortController = prepareAbortController(submitApplicationAbortRef);
      const { ok, data } = await submitQuickApplicationRequest(
        jobId,
        {
          proposedAmount: defaultAmount,
          coverLetter: 'I am interested in this job and would like to discuss the details.',
        },
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      if (ok) {
        toast.success('Application sent');
        setJob((prev) => (prev ? { ...prev, hasApplied: true } : prev));
        refreshApplications();
        resetUserCreditsView();
        return;
      }

      if (data.needsUpgrade) router.push('/dashboard/subscription');
      toast.error('Application failed');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error applying:', error);
      toast.error('Connection error');
    } finally {
      setApplying(false);
    }
  }, [job, jobId, router, submitApplicationAbortRef, setApplying, setShowConfirmModal, setJob, refreshApplications]);

  const handleDetailedApplication = useCallback(async (): Promise<void> => {
    if (!job) {
      toast.error('Job details not available');
      return;
    }

    if (!applicationData.proposedAmount || !applicationData.coverLetter || !applicationData.workPlan) {
      toast.error('Fill required fields: Amount, Work Plan, Cover Letter');
      return;
    }

    if (job.budget.type === 'negotiable' && applicationData.workPlan.length < 100) {
      toast.error('Work plan too short - need 100+ characters');
      return;
    }

    setApplying(true);
    try {
      const abortController = prepareAbortController(submitApplicationAbortRef);
      const { ok } = await submitDetailedApplicationRequest(
        jobId,
        applicationData,
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      if (ok) {
        toast.success('Application submitted');
        setJob((prev) => (prev ? { ...prev, hasApplied: true } : prev));
        setShowApplicationModal(false);
        refreshApplications();
        resetUserCreditsView();
        return;
      }

      toast.error('Submission failed');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error submitting application:', error);
      toast.error('Connection error');
    } finally {
      setApplying(false);
    }
  }, [job, jobId, applicationData, submitApplicationAbortRef, setApplying, setShowApplicationModal, setJob, refreshApplications]);

  const handleAcceptApplication = useCallback(async (applicationId: string): Promise<void> => {
    if (
      !confirm(
        'Are you sure you want to accept this application? This will assign the job to this fixer and reject all other applications.'
      )
    ) {
      return;
    }

    try {
      const abortController = prepareAbortController(assignApplicationAbortRef);
      const { ok } = await updateJobActionRequest(
        jobId,
        { action: 'accept_application', data: { applicationId } },
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      if (ok) {
        toast.success('Application accepted');
        refreshApplications();
        return;
      }

      toast.error('Accept failed');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error accepting application:', error);
      toast.error('Connection error');
    }
  }, [jobId, assignApplicationAbortRef, refreshApplications]);

  const handleRejectApplication = useCallback(async (applicationId: string): Promise<void> => {
    if (!confirm('Are you sure you want to reject this application?')) return;

    try {
      const abortController = prepareAbortController(updateApplicationStatusAbortRef);
      const { ok } = await updateJobActionRequest(
        jobId,
        { action: 'reject_application', data: { applicationId } },
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      if (ok) {
        toast.success('Application rejected');
        refreshApplications();
        return;
      }

      toast.error('Reject failed');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error rejecting application:', error);
      toast.error('Connection error');
    }
  }, [jobId, updateApplicationStatusAbortRef, refreshApplications]);

  return {
    handleQuickApply,
    confirmApplication,
    handleDetailedApplication,
    handleAcceptApplication,
    handleRejectApplication,
  };
}
