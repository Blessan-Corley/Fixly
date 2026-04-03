'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useHirerSubscriptionQuery } from '../../../../hooks/query/subscription';
import { usePostJobDrafts } from '../../../../hooks/usePostJobDrafts';
import { usePostJobLiveValidation } from '../../../../hooks/usePostJobLiveValidation';
import { usePostJobMedia } from '../../../../hooks/usePostJobMedia';
import { INITIAL_POST_JOB_FORM_DATA } from '../../../../lib/jobs/post-job-helpers';
import type {
  BudgetType,
  ErrorField,
  FormErrors,
  FormField,
  FormFieldMap,
  PostJobFormData,
} from '../../../../types/jobs/post-job';
import { useApp } from '../../../providers';

import {
  handleNext as apiHandleNext,
  handleSubmit as apiHandleSubmit,
} from './usePostJobContent.api';

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';

export type PostJobContentState = {
  formData: PostJobFormData;
  loading: boolean;
  errors: FormErrors;
  currentStep: number;
  totalSteps: number;
  showProModal: boolean;
  subscriptionInfo: ReturnType<typeof useHirerSubscriptionQuery>['data'];
  loadingSubscription: boolean;
  drafts: ReturnType<typeof usePostJobDrafts>;
  media: ReturnType<typeof usePostJobMedia>;
  fieldValidations: ReturnType<typeof usePostJobLiveValidation>['fieldValidations'];
  validationMessages: ReturnType<typeof usePostJobLiveValidation>['validationMessages'];
  setShowProModal: (v: boolean) => void;
  handleInputChange: <K extends FormField>(field: K, value: FormFieldMap[K]) => void;
  handleNext: () => Promise<void>;
  handlePrevious: () => void;
  handleSubmit: () => Promise<void>;
};

export function usePostJobContent(): PostJobContentState {
  const { user } = useApp();
  const router = useRouter();

  const [formData, setFormData] = useState<PostJobFormData>(INITIAL_POST_JOB_FORM_DATA);
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showProModal, setShowProModal] = useState<boolean>(false);
  const totalSteps = 4;

  const { data: subscriptionInfo, isLoading: loadingSubscription } = useHirerSubscriptionQuery({
    staleTime: 1000 * 60,
  });

  const finalValidationAbortRef = useRef<AbortController | null>(null);
  const postJobAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (finalValidationAbortRef.current) finalValidationAbortRef.current.abort();
      if (postJobAbortRef.current) postJobAbortRef.current.abort();
    };
  }, []);

  const drafts = usePostJobDrafts({
    currentStep,
    formData,
    isAbortError,
    setCurrentStep,
    setFormData,
    setLoading,
  });

  const media = usePostJobMedia({
    attachments: formData.attachments,
    isAbortError,
    onAttachmentsChange: (nextAttachments) => {
      setFormData((prev) => ({ ...prev, attachments: nextAttachments }));
      if (errors.attachments) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.attachments;
          return next;
        });
      }
    },
  });

  const { fieldValidations, validationMessages } = usePostJobLiveValidation({
    description: formData.description,
    isAbortError,
    title: formData.title,
    userId: user?.id,
  });

  const handleInputChange = <K extends FormField>(field: K, value: FormFieldMap[K]): void => {
    setFormData((prev) => {
      switch (field) {
        case 'title':
        case 'description':
        case 'skillsRequired':
        case 'location':
        case 'deadline':
        case 'urgency':
        case 'type':
        case 'scheduledDate':
        case 'attachments':
          return { ...prev, [field]: value } as PostJobFormData;
        case 'budget.type':
          return { ...prev, budget: { ...prev.budget, type: value as BudgetType } };
        case 'budget.amount':
          return { ...prev, budget: { ...prev.budget, amount: value as string } };
        case 'budget.materialsIncluded':
          return { ...prev, budget: { ...prev.budget, materialsIncluded: value as boolean } };
        default:
          return prev;
      }
    });

    if (field in errors && errors[field as ErrorField]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as ErrorField];
        return next;
      });
    }
  };

  const isPro = Boolean(subscriptionInfo?.plan.isActive);

  const handleNext = (): Promise<void> =>
    apiHandleNext(
      { currentStep, totalSteps, formData, userId: user?.id, isPro },
      { setErrors, setCurrentStep },
      { hasUnsavedChanges: drafts.hasUnsavedChanges, saveDraft: drafts.saveDraft }
    );

  const handlePrevious = (): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (): Promise<void> =>
    apiHandleSubmit(
      { currentStep, formData, userId: user?.id, isPro },
      { setErrors, setCurrentStep, setLoading },
      { postJobAbortRef },
      { currentDraftId: drafts.currentDraftId, clearDraftStateAfterSubmit: drafts.clearDraftStateAfterSubmit },
      router,
      isAbortError
    );

  return {
    formData,
    loading,
    errors,
    currentStep,
    totalSteps,
    showProModal,
    subscriptionInfo,
    loadingSubscription,
    drafts,
    media,
    fieldValidations,
    validationMessages,
    setShowProModal,
    handleInputChange,
    handleNext,
    handlePrevious,
    handleSubmit,
  };
}
