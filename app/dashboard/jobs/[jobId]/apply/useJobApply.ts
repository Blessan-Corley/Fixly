'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useApp } from '@/app/providers';
import { usePageLoading } from '@/contexts/LoadingContext';

import { ApplicationFormSchema, zodResolver } from './apply.schema';
import { DEFAULT_FORM_DATA } from './apply.types';
import type { ApplicationFormData, MaterialItem } from './apply.types';
import { getPlanSummary, getUserId, getUserSkills } from './apply.utils';
import { useJobApplyFetch } from './useJobApplyFetch';
import { useJobApplySubmit } from './useJobApplySubmit';

export type UseJobApplyReturn = {
  job: ReturnType<typeof useJobApplyFetch>['job'];
  loading: boolean;
  hasApplied: boolean;
  showRefreshMessage: boolean;
  pageLoading: boolean;
  globalShowRefreshMessage: boolean;
  formData: ApplicationFormData;
  isSubmitting: boolean;
  safeJobId: string;
  totalMaterialCost: number;
  remainingCredits: string;
  planType: string;
  userSkills: string[];
  setFormData: (updater: (prev: ApplicationFormData) => ApplicationFormData) => void;
  addMaterialItem: () => void;
  removeMaterialItem: (index: number) => void;
  updateMaterialItem: <K extends keyof MaterialItem>(index: number, field: K, value: MaterialItem[K]) => void;
  handleFormSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
};

export function useJobApply(): UseJobApplyReturn {
  const { user } = useApp();
  const params = useParams();
  const router = useRouter();

  const rawJobId = params?.jobId;
  const jobId = Array.isArray(rawJobId) ? rawJobId[0] : rawJobId;
  const safeJobId = typeof jobId === 'string' ? jobId : '';

  const { loading: pageLoading, showRefreshMessage: globalShowRefreshMessage, startLoading, stopLoading } =
    usePageLoading(safeJobId ? `job-apply-${safeJobId}` : 'job-apply');

  const userId = useMemo(() => getUserId(user), [user]);
  const planSummary = useMemo(() => getPlanSummary(user), [user]);
  const userSkills = useMemo(() => getUserSkills(user), [user]);

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit: submitWithValidation,
    formState: { isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(ApplicationFormSchema),
    defaultValues: DEFAULT_FORM_DATA,
  });

  const formData = watch() as ApplicationFormData;

  useEffect(() => {
    register('proposedAmount');
    register('description');
    register('requirements');
    register('specialNotes');
    register('materialsIncluded');
    register('materialsList');
    register('timeEstimate.value');
    register('timeEstimate.unit');
  }, [register]);

  const setFormData = useCallback(
    (updater: (previous: ApplicationFormData) => ApplicationFormData): void => {
      const next = updater(getValues() as ApplicationFormData);
      (Object.keys(next) as Array<keyof ApplicationFormData>).forEach((field) => {
        setValue(field, next[field], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      });
    },
    [getValues, setValue]
  );

  const { job, loading, hasApplied, showRefreshMessage, defaultProposedAmount } = useJobApplyFetch({
    safeJobId,
    userId,
    startLoading,
    stopLoading,
  });

  useEffect(() => {
    if (defaultProposedAmount) {
      setFormData((prev) => ({ ...prev, proposedAmount: defaultProposedAmount }));
    }
  }, [defaultProposedAmount, setFormData]);

  const addMaterialItem = useCallback((): void => {
    setFormData((prev) => ({
      ...prev,
      materialsList: [...prev.materialsList, { item: '', quantity: 1, estimatedCost: 0 }],
    }));
  }, [setFormData]);

  const removeMaterialItem = useCallback(
    (index: number): void => {
      setFormData((prev) => ({
        ...prev,
        materialsList: prev.materialsList.filter((_, i) => i !== index),
      }));
    },
    [setFormData]
  );

  const updateMaterialItem = useCallback(
    <K extends keyof MaterialItem>(index: number, field: K, value: MaterialItem[K]): void => {
      setFormData((prev) => ({
        ...prev,
        materialsList: prev.materialsList.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      }));
    },
    [setFormData]
  );

  const { submitApplication } = useJobApplySubmit({ job, safeJobId, formData, router });

  const totalMaterialCost = useMemo(
    () => formData.materialsList.reduce((sum, item) => sum + item.estimatedCost * item.quantity, 0),
    [formData.materialsList]
  );

  const remainingCredits =
    planSummary.type === 'pro' ? 'unlimited' : String(Math.max(0, 3 - planSummary.creditsUsed));

  const handleFormSubmit = submitWithValidation(submitApplication, () => {
    toast.error('Please fix the highlighted form fields.');
  });

  return {
    job,
    loading,
    hasApplied,
    showRefreshMessage,
    pageLoading,
    globalShowRefreshMessage,
    formData,
    isSubmitting,
    safeJobId,
    totalMaterialCost,
    remainingCredits,
    planType: planSummary.type,
    userSkills,
    setFormData,
    addMaterialItem,
    removeMaterialItem,
    updateMaterialItem,
    handleFormSubmit,
  };
}
