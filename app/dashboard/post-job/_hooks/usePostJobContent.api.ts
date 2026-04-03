import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { toast } from 'sonner';

import { getFirstPostJobErrorMessage } from '../../../../lib/jobs/post-job-helpers';
import {
  buildPostJobContentViolationMessage,
  validatePostJobStep,
} from '../../../../lib/validations/post-job';
import type {
  ContentValidationResponse,
  DraftSummary,
  FormErrors,
  PostJobFormData,
  SaveDraftType,
} from '../../../../types/jobs/post-job';

type RouterLike = { push: (href: string) => void };

export type ContentApiSetters = {
  setErrors: Dispatch<SetStateAction<FormErrors>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
};

export type ContentApiRefs = {
  postJobAbortRef: MutableRefObject<AbortController | null>;
};

export type ContentDraftMethods = {
  hasUnsavedChanges: boolean;
  currentDraftId: string | null | undefined;
  saveDraft: (saveType?: SaveDraftType) => Promise<DraftSummary | undefined>;
  clearDraftStateAfterSubmit: () => void;
};

async function validateContent(
  text: string,
  fieldName: string,
  userId: string | undefined
): Promise<string | null> {
  if (!text || text.trim().length === 0) return null;
  try {
    const contentValidation = await fetch('/api/validate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, context: 'job_posting', userId }),
    });
    if (contentValidation.ok) {
      const result = (await contentValidation.json()) as ContentValidationResponse;
      if (!result.isValid && (result.violations?.length ?? 0) > 0) {
        const violationTypes = (result.violations ?? []).map((v) => v.type);
        return buildPostJobContentViolationMessage(fieldName, violationTypes);
      }
    }
  } catch (error: unknown) {
    console.error('Content validation error:', error);
  }
  return null;
}

async function validateStep(
  step: number,
  formData: PostJobFormData,
  isPro: boolean,
  userId: string | undefined,
  setErrors: Dispatch<SetStateAction<FormErrors>>
): Promise<FormErrors> {
  const newErrors = await validatePostJobStep({
    step,
    formData,
    isPro,
    validateContent: (text, field) => validateContent(text, field, userId),
  });
  setErrors(newErrors);
  return newErrors;
}

export async function handleNext(
  state: {
    currentStep: number;
    totalSteps: number;
    formData: PostJobFormData;
    userId: string | undefined;
    isPro: boolean;
  },
  setters: Pick<ContentApiSetters, 'setErrors' | 'setCurrentStep'>,
  drafts: Pick<ContentDraftMethods, 'hasUnsavedChanges' | 'saveDraft'>
): Promise<void> {
  try {
    const stepErrors = await validateStep(
      state.currentStep,
      state.formData,
      state.isPro,
      state.userId,
      setters.setErrors
    );
    const isValid = Object.keys(stepErrors).length === 0;
    if (isValid) {
      if (drafts.hasUnsavedChanges) {
        await drafts.saveDraft('step_change');
      }
      setters.setCurrentStep((prev) => Math.min(prev + 1, state.totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error(
        getFirstPostJobErrorMessage(stepErrors, 'Please complete all required fields before proceeding')
      );
    }
  } catch (error: unknown) {
    console.error('Navigation error:', error);
    toast.error('An error occurred. Please try again.');
  }
}

export async function handleSubmit(
  state: {
    currentStep: number;
    formData: PostJobFormData;
    userId: string | undefined;
    isPro: boolean;
  },
  setters: ContentApiSetters,
  refs: ContentApiRefs,
  drafts: Pick<ContentDraftMethods, 'currentDraftId' | 'clearDraftStateAfterSubmit'>,
  router: RouterLike,
  isAbortError: (error: unknown) => boolean
): Promise<void> {
  try {
    const stepErrors = await validateStep(
      state.currentStep,
      state.formData,
      state.isPro,
      state.userId,
      setters.setErrors
    );
    const isValid = Object.keys(stepErrors).length === 0;
    if (!isValid) {
      toast.error(
        getFirstPostJobErrorMessage(stepErrors, 'Please complete all required fields before submitting')
      );
      return;
    }

    setters.setLoading(true);

    if (refs.postJobAbortRef.current) {
      refs.postJobAbortRef.current.abort();
    }
    const abortController = new AbortController();
    refs.postJobAbortRef.current = abortController;

    const submissionData = { ...state.formData, draftId: drafts.currentDraftId };
    const response = await fetch('/api/jobs/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData),
      signal: abortController.signal,
    });

    if (abortController.signal.aborted) return;

    let data: { success?: boolean; message?: string; violations?: unknown };
    try {
      data = (await response.json()) as typeof data;
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      throw new Error('Invalid response from server');
    }

    if (response.ok && data.success) {
      toast.success('Job posted successfully!');
      drafts.clearDraftStateAfterSubmit();
      router.push('/dashboard?tab=jobs');
    } else {
      console.error('Error posting job:', data);
      toast.error(data.message ?? 'Failed to post job. Please check your input and try again.');
    }
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error('Error posting job:', error);
    toast.error('Failed to post job. Please check your connection and try again.');
  } finally {
    setters.setLoading(false);
  }
}
