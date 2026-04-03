'use client';

import { useEffect, useRef, useState } from 'react';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import { buildPostJobContentViolationMessage } from '../lib/validations/post-job';
import type {
  ContentValidationResponse,
  ContentViolation,
  FieldValidations,
  ValidationMessages,
} from '../types/jobs/post-job';

interface UsePostJobLiveValidationParams {
  description: string;
  isAbortError: (error: unknown) => boolean;
  title: string;
  userId?: string;
}

interface UsePostJobLiveValidationResult {
  fieldValidations: FieldValidations;
  validationMessages: ValidationMessages;
}

export function usePostJobLiveValidation({
  description,
  isAbortError,
  title,
  userId,
}: UsePostJobLiveValidationParams): UsePostJobLiveValidationResult {
  const [validationMessages, setValidationMessages] = useState<ValidationMessages>({});
  const [fieldValidations, setFieldValidations] = useState<FieldValidations>({});

  const titleValidationAbortRef = useRef<AbortController | null>(null);
  const descriptionValidationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const validateTitle = async (): Promise<void> => {
      if (!title.trim()) {
        setValidationMessages((prev) => ({ ...prev, title: '' }));
        setFieldValidations((prev) => ({ ...prev, title: null }));
        return;
      }

      if (title.length > 30) {
        setValidationMessages((prev) => ({ ...prev, title: 'Title cannot exceed 30 characters' }));
        setFieldValidations((prev) => ({ ...prev, title: false }));
        return;
      }

      if (title.length < 10) {
        setValidationMessages((prev) => ({
          ...prev,
          title: 'Title must be at least 10 characters',
        }));
        setFieldValidations((prev) => ({ ...prev, title: false }));
        return;
      }

      try {
        if (titleValidationAbortRef.current) {
          titleValidationAbortRef.current.abort();
        }

        const abortController = new AbortController();
        titleValidationAbortRef.current = abortController;

        const contentValidation = await fetchWithCsrf('/api/validate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: title,
            context: 'job_posting',
            userId,
          }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (contentValidation.ok) {
          const result = (await contentValidation.json()) as ContentValidationResponse;
          if (!result.isValid && (result.violations?.length ?? 0) > 0) {
            const violationTypes = (result.violations ?? []).map(
              (violation: ContentViolation) => violation.type
            );
            const message = buildPostJobContentViolationMessage('Title', violationTypes);
            setValidationMessages((prev) => ({ ...prev, title: message }));
            setFieldValidations((prev) => ({ ...prev, title: false }));
          } else {
            setValidationMessages((prev) => ({ ...prev, title: '' }));
            setFieldValidations((prev) => ({ ...prev, title: true }));
          }
        }
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }
        console.error('Title validation error:', error);
      }
    };

    const timer = setTimeout(() => {
      void validateTitle();
    }, 500);

    return () => clearTimeout(timer);
  }, [isAbortError, title, userId]);

  useEffect(() => {
    const validateDescription = async (): Promise<void> => {
      if (!description.trim()) {
        setValidationMessages((prev) => ({ ...prev, description: '' }));
        setFieldValidations((prev) => ({ ...prev, description: null }));
        return;
      }

      if (description.length < 30) {
        setValidationMessages((prev) => ({
          ...prev,
          description: 'Description must be at least 30 characters',
        }));
        setFieldValidations((prev) => ({ ...prev, description: false }));
        return;
      }

      try {
        if (descriptionValidationAbortRef.current) {
          descriptionValidationAbortRef.current.abort();
        }

        const abortController = new AbortController();
        descriptionValidationAbortRef.current = abortController;

        const contentValidation = await fetchWithCsrf('/api/validate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: description,
            context: 'job_posting',
            userId,
          }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (contentValidation.ok) {
          const result = (await contentValidation.json()) as ContentValidationResponse;
          if (!result.isValid && (result.violations?.length ?? 0) > 0) {
            const violationTypes = (result.violations ?? []).map(
              (violation: ContentViolation) => violation.type
            );
            const message = buildPostJobContentViolationMessage('Description', violationTypes);
            setValidationMessages((prev) => ({ ...prev, description: message }));
            setFieldValidations((prev) => ({ ...prev, description: false }));
          } else {
            setValidationMessages((prev) => ({ ...prev, description: '' }));
            setFieldValidations((prev) => ({ ...prev, description: true }));
          }
        }
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }
        console.error('Description validation error:', error);
      }
    };

    const timer = setTimeout(() => {
      void validateDescription();
    }, 500);

    return () => clearTimeout(timer);
  }, [description, isAbortError, userId]);

  useEffect(() => {
    return () => {
      if (titleValidationAbortRef.current) titleValidationAbortRef.current.abort();
      if (descriptionValidationAbortRef.current) descriptionValidationAbortRef.current.abort();
    };
  }, []);

  return {
    fieldValidations,
    validationMessages,
  };
}
