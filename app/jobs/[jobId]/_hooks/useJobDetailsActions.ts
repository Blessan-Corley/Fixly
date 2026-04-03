'use client';

import { useRouter } from 'next/navigation';
import type { Session } from 'next-auth';
import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';


import { INITIAL_APPLICATION } from '../_lib/jobDetails.constants';
import type { ApplicationFormData, JobDetails } from '../_lib/jobDetails.types';

type JobDetailsActionsParams = {
  safeJobId: string;
  session: Session | null;
  sessionUserId: string;
  job: JobDetails | null;
  applyToJob: (data: { proposedAmount: number; message: string; estimatedTime: string }) => Promise<unknown>;
  completeJob: () => Promise<unknown>;
  hasUserReview: boolean;
  refetchJobDetail: () => void;
};

export type JobDetailsActionsState = {
  applying: boolean;
  showApplicationForm: boolean;
  showCompletionConfirm: boolean;
  applicationData: ApplicationFormData;
  hasApplied: boolean;
  setShowApplicationForm: (value: boolean) => void;
  setShowCompletionConfirm: (value: boolean) => void;
  setApplicationData: Dispatch<SetStateAction<ApplicationFormData>>;
  handleApplyToJob: () => Promise<void>;
  handleCompleteJob: () => Promise<void>;
};

export function useJobDetailsActions({
  safeJobId,
  session,
  sessionUserId,
  job,
  applyToJob,
  completeJob,
  hasUserReview,
  refetchJobDetail,
}: JobDetailsActionsParams): JobDetailsActionsState {
  const router = useRouter();

  const [applying, setApplying] = useState<boolean>(false);
  const [submittedApplication, setSubmittedApplication] = useState<boolean>(false);
  const [showApplicationForm, setShowApplicationForm] = useState<boolean>(false);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState<boolean>(false);
  const [applicationData, setApplicationData] = useState<ApplicationFormData>(INITIAL_APPLICATION);

  const hasApplied = useMemo<boolean>(() => {
    if (submittedApplication) return true;
    if (!job || !sessionUserId) return false;
    return job.applications.some((application) => application.fixerId === sessionUserId);
  }, [job, sessionUserId, submittedApplication]);

  const handleApplyToJob = useCallback(async (): Promise<void> => {
    if (!safeJobId) return;
    if (!session) {
      toast.error('Please sign in to apply for jobs');
      router.push('/auth/signin');
      return;
    }
    if (session.user.role !== 'fixer') {
      toast.error('Only fixers can apply to jobs');
      return;
    }
    const amount = Number.parseFloat(applicationData.proposedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid proposed amount');
      return;
    }
    if (!applicationData.message.trim()) {
      toast.error('Please include a cover message');
      return;
    }
    setApplying(true);
    try {
      await applyToJob({
        proposedAmount: amount,
        message: applicationData.message.trim(),
        estimatedTime: applicationData.estimatedTime.trim(),
      });
      setSubmittedApplication(true);
      setShowApplicationForm(false);
      setApplicationData(INITIAL_APPLICATION);
      refetchJobDetail();
    } catch (applyError) {
      const message =
        applyError instanceof Error ? applyError.message : 'Error applying to job. Please try again.';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  }, [applyToJob, applicationData, refetchJobDetail, router, safeJobId, session]);

  const handleCompleteJob = useCallback(async (): Promise<void> => {
    if (!safeJobId) return;
    try {
      await completeJob();
      setShowCompletionConfirm(false);
      refetchJobDetail();
      if (!hasUserReview) {
        toast('You can leave a review now.', {
          description: 'Share how the job went while the details are still fresh.',
        });
      }
    } catch (completionError: unknown) {
      const message =
        completionError instanceof Error ? completionError.message : 'Failed to mark the job as complete.';
      toast.error(message);
    }
  }, [completeJob, hasUserReview, refetchJobDetail, safeJobId]);

  return {
    applying,
    showApplicationForm,
    showCompletionConfirm,
    applicationData,
    hasApplied,
    setShowApplicationForm,
    setShowCompletionConfirm,
    setApplicationData,
    handleApplyToJob,
    handleCompleteJob,
  };
}
