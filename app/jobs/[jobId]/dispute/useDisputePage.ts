'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useForm, type SubmitErrorHandler } from 'react-hook-form';
import { toast } from 'sonner';

import { DisputeFormSchema, zodResolver } from './dispute.schema';
import type { DisputeFormData, JobDetails } from './dispute.types';
import { INITIAL_FORM_DATA } from './dispute.types';
import { asString, getPartyId } from './dispute.utils';
import {
  fetchJobDetails as apiFetchJobDetails,
  handleEvidenceUpload as apiHandleEvidenceUpload,
  submitDispute as apiSubmitDispute,
} from './useDisputePage.api';

export type UseDisputePageResult = {
  job: JobDetails | null;
  loading: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  disputeData: DisputeFormData;
  otherParty: JobDetails['client'] | JobDetails['fixer'] | null;
  submitWithValidation: ReturnType<typeof useForm<DisputeFormData>>['handleSubmit'];
  submitDispute: () => Promise<void>;
  onInvalidSubmit: SubmitErrorHandler<DisputeFormData>;
  setDisputeData: (updater: (previous: DisputeFormData) => DisputeFormData) => void;
  handleEvidenceUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  removeEvidence: (evidenceId: string) => void;
  updateEvidenceDescription: (evidenceId: string, description: string) => void;
  handleBack: () => void;
};

export function useDisputePage(): UseDisputePageResult {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const rawJobId = params?.jobId;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
  const safeJobId = typeof jobId === 'string' ? jobId : '';
  const userId = asString(session?.user?.id);

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit: submitWithValidation,
    formState: { isSubmitting },
  } = useForm<DisputeFormData>({
    resolver: zodResolver(DisputeFormSchema),
    defaultValues: INITIAL_FORM_DATA,
  });

  const disputeData = watch() as DisputeFormData;

  useEffect(() => {
    (Object.keys(INITIAL_FORM_DATA) as Array<keyof DisputeFormData>).forEach((field) => {
      register(field);
    });
  }, [register]);

  const setDisputeData = (updater: (previous: DisputeFormData) => DisputeFormData): void => {
    const next = updater(getValues() as DisputeFormData);
    (Object.keys(next) as Array<keyof DisputeFormData>).forEach((field) => {
      setValue(field, next[field], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    });
  };

  useEffect(() => {
    if (!userId || !safeJobId) {
      setLoading(false);
      return;
    }
    void apiFetchJobDetails(safeJobId, userId, router, { setJob, setLoading });
  }, [router, safeJobId, userId]);

  const handleEvidenceUpload = (event: ChangeEvent<HTMLInputElement>): Promise<void> =>
    apiHandleEvidenceUpload(event, setDisputeData);

  const removeEvidence = (evidenceId: string): void => {
    setDisputeData((prev) => ({
      ...prev,
      evidence: prev.evidence.filter((e) => e.id !== evidenceId),
    }));
  };

  const updateEvidenceDescription = (evidenceId: string, description: string): void => {
    setDisputeData((prev) => ({
      ...prev,
      evidence: prev.evidence.map((e) => (e.id === evidenceId ? { ...e, description } : e)),
    }));
  };

  const submitDispute = (): Promise<void> =>
    apiSubmitDispute(job, userId, safeJobId, disputeData, router);

  const onInvalidSubmit: SubmitErrorHandler<DisputeFormData> = (): void => {
    toast.error('Please fill in all required fields');
  };

  const otherParty = useMemo(() => {
    if (!job) return null;
    const isClient = getPartyId(job.client) === userId;
    return isClient ? job.fixer : job.client;
  }, [job, userId]);

  const canSubmit =
    !isSubmitting &&
    !!disputeData.category &&
    !!disputeData.title &&
    !!disputeData.description &&
    !!disputeData.desiredOutcome;

  const handleBack = (): void => {
    router.back();
  };

  return {
    job,
    loading,
    isSubmitting,
    canSubmit,
    disputeData,
    otherParty,
    submitWithValidation,
    submitDispute,
    onInvalidSubmit,
    setDisputeData,
    handleEvidenceUpload,
    removeEvidence,
    updateEvidenceDescription,
    handleBack,
  };
}
