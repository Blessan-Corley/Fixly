'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { FixerUser } from './browse-jobs.types';
import { isAbortError } from './browse-jobs.utils';

type UseQuickApplyOptions = {
  normalizedUser: FixerUser;
  onNavigate: (path: string) => void;
};

type UseQuickApplyResult = {
  applyingJobs: Set<string>;
  handleQuickApply: (jobId: string) => Promise<void>;
};

function canUserApplyToJob(user: FixerUser): boolean {
  if (user.role !== 'fixer') return false;
  if (user.banned) return false;
  if (user.planType === 'pro' && user.planStatus === 'active') return true;
  return user.creditsUsed < 3;
}

export function useQuickApply({
  normalizedUser,
  onNavigate,
}: UseQuickApplyOptions): UseQuickApplyResult {
  const [applyingJobs, setApplyingJobs] = useState<Set<string>>(new Set<string>());
  const checkJobAbortRef = useRef<AbortController | null>(null);

  const handleQuickApply = async (jobId: string): Promise<void> => {
    if (!jobId) {
      toast.error('Invalid job ID. Please try again.');
      return;
    }

    if (!canUserApplyToJob(normalizedUser)) {
      toast.error('You have used all free applications. Upgrade to Pro for unlimited access.');
      onNavigate('/dashboard/subscription');
      return;
    }

    setApplyingJobs((prev) => {
      const next = new Set(prev);
      next.add(jobId);
      return next;
    });

    if (checkJobAbortRef.current) checkJobAbortRef.current.abort();
    const abortController = new AbortController();
    checkJobAbortRef.current = abortController;

    try {
      const checkResponse = await fetch(`/api/jobs/${jobId}?forApplication=true`, {
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) return;
      if (!checkResponse.ok) {
        throw new Error(`Job not found or not accessible: ${checkResponse.status}`);
      }

      onNavigate(`/dashboard/jobs/${jobId}/apply`);
      toast.success('Opening application form...');
    } catch (error) {
      if (isAbortError(error)) return;
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to open application form: ${message}`);
      setApplyingJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }

    setTimeout(() => {
      setApplyingJobs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }, 3000);
  };

  return { applyingJobs, handleQuickApply };
}
