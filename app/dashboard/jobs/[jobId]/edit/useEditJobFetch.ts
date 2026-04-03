'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_FORM_DATA } from './edit.types';
import type { JobDetailsResponse, JobEditFormData, JobRecord } from './edit.types';
import { asNumber, isAbortError, normalizeJob } from './edit.utils';

export type UseEditJobFetchResult = {
  formData: JobEditFormData;
  setFormData: React.Dispatch<React.SetStateAction<JobEditFormData>>;
  initialFormData: JobEditFormData | null;
  setInitialFormData: React.Dispatch<React.SetStateAction<JobEditFormData | null>>;
  loading: boolean;
  originalJob: JobRecord | null;
  fetchJobAbortRef: React.MutableRefObject<AbortController | null>;
};

export function useEditJobFetch(jobId: string): UseEditJobFetchResult {
  const router = useRouter();

  const [formData, setFormData] = useState<JobEditFormData>(DEFAULT_FORM_DATA);
  const [initialFormData, setInitialFormData] = useState<JobEditFormData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [originalJob, setOriginalJob] = useState<JobRecord | null>(null);

  const fetchJobAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      fetchJobAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    void fetchJobDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const fetchJobDetails = async (): Promise<void> => {
    try {
      fetchJobAbortRef.current?.abort();
      const abortController = new AbortController();
      fetchJobAbortRef.current = abortController;

      const response = await fetch(`/api/jobs/${jobId}`, { signal: abortController.signal });

      if (abortController.signal.aborted) return;

      const data = (await response.json()) as JobDetailsResponse;

      if (response.ok) {
        const job = normalizeJob(data.job);
        if (!job) {
          toast.error('Failed to parse job details');
          router.push('/dashboard');
          return;
        }
        setOriginalJob(job);

        const populated: JobEditFormData = {
          title: job.title ?? '',
          description: job.description ?? '',
          skillsRequired: job.skillsRequired ?? [],
          budget: {
            type: job.budget?.type ?? 'negotiable',
            amount: String(job.budget?.amount ?? ''),
            materialsIncluded: job.budget?.materialsIncluded ?? false,
          },
          location: {
            address: job.location?.address ?? '',
            city: job.location?.city ?? '',
            state: job.location?.state ?? '',
            pincode: job.location?.pincode ?? '',
            lat: asNumber(job.location?.lat) ?? null,
            lng: asNumber(job.location?.lng) ?? null,
          },
          deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 16) : '',
          urgency: job.urgency ?? 'flexible',
          type: job.type ?? 'one-time',
          experienceLevel: job.experienceLevel ?? 'intermediate',
          scheduledDate: job.scheduledDate
            ? new Date(job.scheduledDate).toISOString().slice(0, 16)
            : '',
          estimatedDuration: {
            value: String(job.estimatedDuration?.value ?? ''),
            unit: job.estimatedDuration?.unit ?? 'hours',
          },
        };
        setFormData(populated);
        setInitialFormData(populated);
      } else {
        toast.error(data.message ?? 'Failed to load job details');
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error fetching job:', error);
      toast.error('Failed to load job details');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    initialFormData,
    setInitialFormData,
    loading,
    originalJob,
    fetchJobAbortRef,
  };
}
