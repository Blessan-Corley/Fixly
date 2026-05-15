'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { analytics, EventTypes } from '../../lib/analytics-client';
import { queryKeys } from '../../lib/queryKeys';
import { optimisticUpdates } from '../../lib/reactQuery';

import {
  type ApplyMutateContext,
  type ApplyPayload,
  getMutationJobId,
} from './jobs.helpers';
import { fetcher } from './shared';
import type { BaseEntity, JobResponse, MutationHookOptions, SessionUser } from './shared';

export const useCreateJob = (
  options: MutationHookOptions<JobResponse, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (jobData: Record<string, unknown>) =>
      fetcher<JobResponse>('/api/jobs/post', {
        method: 'POST',
        body: JSON.stringify(jobData),
      }),
    onSuccess: (data: JobResponse, variables: Record<string, unknown>) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });

      const createdJobId = getMutationJobId(data);

      analytics.trackEvent(EventTypes.JOB_INTERACTION, {
        jobId: createdJobId,
        userId: user?.id,
        jobTitle: data?.title,
        budget: data?.budget?.amount,
      });

      toast.success('Job posted successfully!');
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: Record<string, unknown>) => {
      toast.error(error.message || 'Failed to create job');
      onError?.(error, variables);
    },
    ...mutationOptions,
  });
};

export const useApplyToJob = (
  options: MutationHookOptions<BaseEntity, ApplyPayload, ApplyMutateContext> = {}
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, onMutate, ...mutationOptions } = options;

  return useMutation({
    mutationFn: ({ jobId, applicationData }: ApplyPayload) =>
      fetcher<BaseEntity>(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify(applicationData),
      }),
    onMutate: async ({ jobId, applicationData }: ApplyPayload) => {
      const optimisticApplication = {
        _id: `temp_${Date.now()}`,
        fixer: session?.user,
        message: applicationData.message,
        bidAmount: applicationData.bidAmount,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      optimisticUpdates.applyToJob(jobId, optimisticApplication);
      const externalContext = await onMutate?.({ jobId, applicationData });
      return externalContext ?? { jobId, optimisticApplication };
    },
    onSuccess: (
      data: BaseEntity,
      variables: ApplyPayload,
      context: ApplyMutateContext | undefined
    ) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });

      analytics.trackEvent(EventTypes.JOB_INTERACTION, {
        jobId: variables.jobId,
        userId: user?.id,
        bidAmount: variables.applicationData.bidAmount,
      });

      toast.success('Application submitted successfully!');
      onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables: ApplyPayload, context: ApplyMutateContext | undefined) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });
      toast.error(error.message || 'Failed to submit application');
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
