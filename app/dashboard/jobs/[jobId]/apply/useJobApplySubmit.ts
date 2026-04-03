'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { toastMessages } from '@/utils/toast';

import type { ApplicationFormData, ApplyApiPayload, JobDetails } from './apply.types';
import { asBoolean, getResponseMessage, isAbortError, isRecord, parseResponsePayload } from './apply.utils';

type RouterLike = { push: (url: string) => void };

export type UseJobApplySubmitResult = {
  submitApplicationAbortRef: React.MutableRefObject<AbortController | null>;
  submitApplication: () => Promise<void>;
};

type UseJobApplySubmitParams = {
  job: JobDetails | null;
  safeJobId: string;
  formData: ApplicationFormData;
  router: RouterLike;
};

export function useJobApplySubmit({
  job,
  safeJobId,
  formData,
  router,
}: UseJobApplySubmitParams): UseJobApplySubmitResult {
  const submitApplicationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      submitApplicationAbortRef.current?.abort();
    };
  }, []);

  const submitApplication = useCallback(async (): Promise<void> => {
    if (!job || !safeJobId) {
      toast.error('Job details not available');
      return;
    }

    const amount = Number.parseFloat(formData.proposedAmount);
    if (submitApplicationAbortRef.current) submitApplicationAbortRef.current.abort();
    const abortController = new AbortController();
    submitApplicationAbortRef.current = abortController;

    try {
      const normalizedMaterials = formData.materialsIncluded
        ? formData.materialsList
            .map((item) => ({
              item: item.item.trim(),
              quantity: Math.max(1, Math.floor(item.quantity || 1)),
              estimatedCost: Math.max(0, item.estimatedCost || 0),
            }))
            .filter((item) => item.item.length > 0)
        : [];

      const timeEstimateValue = Number(formData.timeEstimate.value);
      const hasTimeEstimate = Number.isFinite(timeEstimateValue) && timeEstimateValue > 0;

      const response = await fetch(`/api/jobs/${safeJobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedAmount: amount,
          description: formData.description.trim(),
          timeEstimate: hasTimeEstimate
            ? { value: timeEstimateValue, unit: formData.timeEstimate.unit }
            : undefined,
          materialsIncluded: formData.materialsIncluded,
          materialsList: normalizedMaterials,
          requirements: formData.requirements.trim(),
          specialNotes: formData.specialNotes.trim(),
        }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      const payload = (await parseResponsePayload(response)) as ApplyApiPayload | null;
      if (!response.ok) {
        if (payload && isRecord(payload) && asBoolean(payload.needsUpgrade)) {
          toast.error('Upgrade Required', {
            description: getResponseMessage(payload, 'Upgrade required to continue applying for jobs.'),
            action: { label: 'Upgrade Now', onClick: () => router.push('/dashboard/subscription') },
          });
        } else {
          toastMessages.job.applicationFailed(getResponseMessage(payload, 'Failed to submit application'));
        }
        return;
      }

      toastMessages.job.applied();
      router.push('/dashboard/applications');
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error submitting application:', error);
      toastMessages.job.applicationFailed('Network error occurred');
    }
  }, [formData, job, router, safeJobId]);

  return { submitApplicationAbortRef, submitApplication };
}
