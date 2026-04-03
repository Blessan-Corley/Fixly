'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useHirerSubscriptionQuery } from '../../../../../hooks/query/subscription';

import type {
  CitySearchResult,
  JobEditFormData,
  JobRecord,
  JobUpdateResponse,
  ValidationErrors,
} from './edit.types';
import { isAbortError, isRecord } from './edit.utils';
import { useEditJobFetch } from './useEditJobFetch';

export interface UseEditJobResult {
  formData: JobEditFormData;
  loading: boolean;
  saving: boolean;
  errors: ValidationErrors;
  originalJob: JobRecord | null;
  showProModal: boolean;
  isPro: boolean;
  loadingSubscription: boolean;
  setShowProModal: (value: boolean) => void;
  handleInputChange: (field: string, value: unknown) => void;
  handleSubmit: () => Promise<void>;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
  selectCity: (city: CitySearchResult) => void;
}

export function useEditJob(jobId: string): UseEditJobResult {
  const router = useRouter();

  const { formData, setFormData, initialFormData, loading, originalJob } = useEditJobFetch(jobId);

  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showProModal, setShowProModal] = useState<boolean>(false);

  const updateJobAbortRef = useRef<AbortController | null>(null);

  const { data: subscriptionInfo, isLoading: loadingSubscription } = useHirerSubscriptionQuery({
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    return () => {
      updateJobAbortRef.current?.abort();
    };
  }, []);

  const handleInputChange = (field: string, value: unknown): void => {
    setFormData((prev) => {
      if (field.includes('.')) {
        const dotIndex = field.indexOf('.');
        const parent = field.slice(0, dotIndex);
        const child = field.slice(dotIndex + 1);
        const parentKey = parent as keyof JobEditFormData;
        const parentValue = prev[parentKey];
        if (!isRecord(parentValue)) return prev;
        return { ...prev, [parent]: { ...parentValue, [child]: value } } as JobEditFormData;
      }
      return { ...prev, [field]: value } as JobEditFormData;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 30) {
      newErrors.description = 'Description must be at least 30 characters';
    }

    if (formData.skillsRequired.length === 0) {
      newErrors.skillsRequired = 'At least one skill is required';
    }

    if (formData.budget.type !== 'negotiable' && !formData.budget.amount) {
      newErrors['budget.amount'] = 'Budget amount is required';
    }

    if (!formData.location.address.trim()) {
      newErrors['location.address'] = 'Address is required';
    }

    if (!formData.location.city.trim()) {
      newErrors['location.city'] = 'City is required';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else if (new Date(formData.deadline) <= new Date()) {
      newErrors.deadline = 'Deadline must be in the future';
    }

    return newErrors;
  };

  const handleSubmit = async (): Promise<void> => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error(`Please fix ${Object.keys(validationErrors).length} error(s) before saving`);
      return;
    }

    if (initialFormData && JSON.stringify(initialFormData) === JSON.stringify(formData)) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      updateJobAbortRef.current?.abort();
      const abortController = new AbortController();
      updateJobAbortRef.current = abortController;

      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_details', data: formData }),
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;

      const data = (await response.json()) as JobUpdateResponse;

      if (response.ok) {
        toast.success('Job updated successfully!');
        router.push(`/dashboard/jobs/${jobId}`);
      } else {
        toast.error(data.message ?? 'Failed to update job');
      }
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill: string): void => {
    if (!formData.skillsRequired.includes(skill)) {
      handleInputChange('skillsRequired', [...formData.skillsRequired, skill]);
    }
  };

  const removeSkill = (skill: string): void => {
    handleInputChange(
      'skillsRequired',
      formData.skillsRequired.filter((s) => s !== skill)
    );
  };

  const selectCity = (city: CitySearchResult): void => {
    handleInputChange('location', {
      address: formData.location.address,
      city: city.name,
      state: city.state,
      pincode: formData.location.pincode,
      lat: city.lat,
      lng: city.lng,
    });
  };

  const isPro = subscriptionInfo?.plan?.isActive ?? false;

  return {
    formData,
    loading,
    saving,
    errors,
    originalJob,
    showProModal,
    isPro,
    loadingSubscription,
    setShowProModal,
    handleInputChange,
    handleSubmit,
    addSkill,
    removeSkill,
    selectCity,
  };
}
