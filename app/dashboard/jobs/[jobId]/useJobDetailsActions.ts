'use client';

import { useRouter } from 'next/navigation';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { submitRatingRequest, updateJobActionRequest } from './page.api';
import { createInitialRatingData, type RatingFormData } from './page.helpers';
import type { DashboardUser, JobAction, JobDetails } from './page.types';
import {
  getActionSuccessMessage,
  isAbortError,
  prepareAbortController,
  shareJobFromPage,
} from './useJobDetailsController.utils';

type UseJobDetailsActionsParams = {
  jobId: string;
  user: DashboardUser | null;
  job: JobDetails | null;
  ratingData: RatingFormData;
  updateJobStatusAbortRef: MutableRefObject<AbortController | null>;
  submitRatingAbortRef: MutableRefObject<AbortController | null>;
  setShowRatingModal: Dispatch<SetStateAction<boolean>>;
  setRatingData: Dispatch<SetStateAction<RatingFormData>>;
  refreshJobDetails: () => void;
};

type UseJobDetailsActionsResult = {
  handleJobAction: (action: JobAction) => Promise<void>;
  handleSubmitRating: () => Promise<void>;
  handleMessageFixer: (fixerId: string) => void;
  shareJob: () => Promise<void>;
};

export function useJobDetailsActions({
  jobId,
  user,
  job,
  ratingData,
  updateJobStatusAbortRef,
  submitRatingAbortRef,
  setShowRatingModal,
  setRatingData,
  refreshJobDetails,
}: UseJobDetailsActionsParams): UseJobDetailsActionsResult {
  const router = useRouter();

  const handleJobAction = useCallback(async (action: JobAction): Promise<void> => {
    try {
      const abortController = prepareAbortController(updateJobStatusAbortRef);
      const { ok } = await updateJobActionRequest(
        jobId,
        { action, data: {} },
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      if (ok) {
        toast.success(getActionSuccessMessage(action));
        if (action === 'confirm_completion') setShowRatingModal(true);
        refreshJobDetails();
        return;
      }

      toast.error('Status update failed');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error updating job:', error);
      toast.error('Connection error');
    }
  }, [jobId, updateJobStatusAbortRef, setShowRatingModal, refreshJobDetails]);

  const handleSubmitRating = useCallback(async (): Promise<void> => {
    if (!user?.role) {
      toast.error('You must be signed in to submit a rating');
      return;
    }

    try {
      const abortController = prepareAbortController(submitRatingAbortRef);
      const { ok } = await submitRatingRequest(
        jobId,
        {
          rating: ratingData.rating,
          review: ratingData.review,
          categories: ratingData.categories,
          ratedBy: user.role,
        },
        abortController.signal
      );

      if (abortController.signal.aborted) return;

      if (ok) {
        toast.success('Rating submitted');
        setShowRatingModal(false);
        refreshJobDetails();
        setRatingData(createInitialRatingData());
        return;
      }

      toast.error('Rating failed');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error submitting rating:', error);
      toast.error('Connection error');
    }
  }, [jobId, user, ratingData, submitRatingAbortRef, setShowRatingModal, setRatingData, refreshJobDetails]);

  const handleMessageFixer = useCallback((fixerId: string): void => {
    void fixerId;
    router.push(`/dashboard/jobs/${jobId}/messages`);
  }, [jobId, router]);

  const shareJob = useCallback(async (): Promise<void> => {
    await shareJobFromPage(job);
  }, [job]);

  return { handleJobAction, handleSubmitRating, handleMessageFixer, shareJob };
}
