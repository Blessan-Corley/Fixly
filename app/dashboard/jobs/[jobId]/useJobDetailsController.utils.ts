'use client';

import type { MutableRefObject } from 'react';
import { toast } from 'sonner';

import type { JobAction, JobDetails } from './page.types';

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const prepareAbortController = (
  abortRef: MutableRefObject<AbortController | null>
): AbortController => {
  if (abortRef.current) {
    abortRef.current.abort();
  }

  const abortController = new AbortController();
  abortRef.current = abortController;
  return abortController;
};

export const resetUserCreditsView = (): void => {
  if (typeof window !== 'undefined' && window.location) {
    window.location.reload();
  }
};

export const getActionSuccessMessage = (action: JobAction): string => {
  switch (action) {
    case 'mark_in_progress':
      return 'Job marked as in progress';
    case 'mark_completed':
      return 'Job marked as completed';
    case 'confirm_completion':
      return 'Job completion confirmed';
    case 'confirm_progress':
      return 'Progress confirmed';
    default:
      return 'Action completed successfully';
  }
};

export const shareJobFromPage = async (job: JobDetails | null): Promise<void> => {
  if (!job) {
    return;
  }

  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({
        title: job.title,
        text: `${job.description.substring(0, 100)}...`,
        url,
      });
    } catch (error: unknown) {
      if (isObject(error) && typeof error.name === 'string' && error.name === 'AbortError') {
        return;
      }

      console.log('Share cancelled');
    }
    return;
  }

  await navigator.clipboard.writeText(url);
  toast.success('Link copied');
};
