import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import type { DisputeApiPayload, DisputeFormData, JobDetails } from './dispute.types';
import { MAX_UPLOAD_BYTES } from './dispute.types';
import {
  asBoolean,
  asString,
  fileToEvidence,
  getMessage,
  getPartyId,
  isRecord,
  normalizeJob,
} from './dispute.utils';

type RouterLike = { push: (href: string) => void };

export type DisputeApiSetters = {
  setJob: Dispatch<SetStateAction<JobDetails | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

export async function fetchJobDetails(
  safeJobId: string,
  userId: string,
  router: RouterLike,
  setters: DisputeApiSetters
): Promise<void> {
  const { setJob, setLoading } = setters;
  try {
    setLoading(true);
    const response = await fetch(`/api/jobs/${safeJobId}`);
    const payload = (await response.json()) as {
      success?: unknown;
      job?: unknown;
      message?: unknown;
    };

    if (!response.ok || !asBoolean(payload.success)) {
      toast.error(getMessage(payload, 'Failed to fetch job details'));
      router.push('/dashboard');
      return;
    }

    const normalizedJob = normalizeJob(payload.job);
    if (!normalizedJob) {
      toast.error('Failed to parse job details');
      router.push('/dashboard');
      return;
    }

    const isClient = getPartyId(normalizedJob.client) === userId;
    const isFixer = getPartyId(normalizedJob.fixer) === userId;

    if (!isClient && !isFixer) {
      toast.error('You can only create disputes for jobs you are involved in');
      router.push(`/jobs/${safeJobId}`);
      return;
    }

    if ((isClient && !normalizedJob.fixer) || (isFixer && !normalizedJob.client)) {
      toast.error('Dispute cannot be created until both parties are assigned');
      router.push(`/jobs/${safeJobId}`);
      return;
    }

    setJob(normalizedJob);
  } catch (error) {
    console.error('Error fetching job details:', error);
    toast.error('Failed to fetch job details');
    router.push('/dashboard');
  } finally {
    setLoading(false);
  }
}

export async function handleEvidenceUpload(
  event: ChangeEvent<HTMLInputElement>,
  setDisputeData: (updater: (prev: DisputeFormData) => DisputeFormData) => void
): Promise<void> {
  const fileList = event.target.files;
  if (!fileList) return;

  const files = Array.from(fileList);
  const validFiles: File[] = [];

  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
      continue;
    }
    validFiles.push(file);
  }

  if (validFiles.length === 0) return;

  try {
    const evidenceItems = await Promise.all(validFiles.map((file) => fileToEvidence(file)));
    setDisputeData((prev) => ({
      ...prev,
      evidence: [...prev.evidence, ...evidenceItems],
    }));
  } catch {
    toast.error('Failed to read one or more files');
  } finally {
    event.target.value = '';
  }
}

export async function submitDispute(
  job: JobDetails | null,
  userId: string,
  safeJobId: string,
  disputeData: DisputeFormData,
  router: RouterLike
): Promise<void> {
  if (!job || !userId || !safeJobId) {
    toast.error('Unable to submit dispute right now');
    return;
  }

  if (
    !disputeData.category ||
    !disputeData.title ||
    !disputeData.description ||
    !disputeData.desiredOutcome
  ) {
    toast.error('Please fill in all required fields');
    return;
  }

  const isClient = getPartyId(job.client) === userId;
  const againstUserId = isClient ? getPartyId(job.fixer) : getPartyId(job.client);

  if (!againstUserId) {
    toast.error('Other party is not available for this dispute');
    return;
  }

  try {
    const response = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: safeJobId,
        againstUserId,
        category: disputeData.category,
        subcategory: disputeData.subcategory,
        title: disputeData.title,
        description: disputeData.description,
        desiredOutcome: disputeData.desiredOutcome,
        desiredOutcomeDetails: disputeData.desiredOutcomeDetails,
        disputedAmount: disputeData.disputedAmount
          ? Number.parseFloat(disputeData.disputedAmount)
          : undefined,
        refundRequested: disputeData.refundRequested
          ? Number.parseFloat(disputeData.refundRequested)
          : undefined,
        additionalPaymentRequested: disputeData.additionalPaymentRequested
          ? Number.parseFloat(disputeData.additionalPaymentRequested)
          : undefined,
        evidence: disputeData.evidence.map((e) => ({
          type: e.type,
          url: e.url,
          filename: e.filename,
          description: e.description,
        })),
      }),
    });

    const payload = (await response.json()) as DisputeApiPayload;

    if (!response.ok || !asBoolean(payload.success)) {
      toast.error(getMessage(payload, 'Failed to submit dispute'));
      return;
    }

    toast.success('Dispute submitted successfully');

    const disputeRecord = isRecord(payload.dispute) ? payload.dispute : {};
    const disputeId =
      asString(disputeRecord.disputeId) ||
      asString(disputeRecord._id) ||
      asString(disputeRecord.id);

    router.push(disputeId ? `/dashboard/disputes/${disputeId}` : '/dashboard/disputes');
  } catch (error) {
    console.error('Error submitting dispute:', error);
    toast.error('Failed to submit dispute');
  }
}
