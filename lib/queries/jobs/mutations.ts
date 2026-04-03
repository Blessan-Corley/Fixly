import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from '../keys';

import { fetchJson } from './fetchers';

type QueryResponse = Record<string, unknown>;

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: unknown): Promise<QueryResponse> => {
      return fetchJson('/api/jobs/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.browse({}) });
    },
  });
}

export function useSaveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      saved,
    }: {
      jobId: string;
      saved: boolean;
    }): Promise<QueryResponse> => {
      return fetchJson(`/api/jobs/${jobId}/save`, {
        method: saved ? 'POST' : 'DELETE',
      });
    },
    onMutate: async ({ jobId, saved }: { jobId: string; saved: boolean }) => {
      if (!saved) {
        await queryClient.cancelQueries({ queryKey: queryKeys.jobs.saved });
        const previous = queryClient.getQueryData(queryKeys.jobs.saved);
        queryClient.setQueryData(queryKeys.jobs.saved, (old: QueryResponse | undefined) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.filter((job) => {
              return (
                !job ||
                typeof job !== 'object' ||
                !('_id' in job) ||
                String((job as Record<string, unknown>)._id) !== jobId
              );
            }),
          };
        });
        return { previous };
      }
      return {};
    },
    onError: (_error, _variables, context) => {
      if (context && typeof context === 'object' && 'previous' in context) {
        queryClient.setQueryData(queryKeys.jobs.saved, context.previous);
      }
      toast.error('Failed to update saved jobs');
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.saved ? 'Job saved' : 'Job removed from saved');
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.saved });
    },
  });
}

export function useApplyToJob(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationData: unknown): Promise<QueryResponse> => {
      return fetchJson(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData),
      });
    },
    onSuccess: () => {
      toast.success('Application submitted successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.applications(jobId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to apply');
    },
  });
}

export function usePostReview(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { rating: number; review: string }): Promise<QueryResponse> => {
      return fetchJson(`/api/jobs/${jobId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast.success('Review submitted successfully');
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.reviews(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    },
  });
}

export function useCompleteJob(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<QueryResponse> => {
      return fetchJson(`/api/jobs/${jobId}/complete`, { method: 'PATCH' });
    },
    onSuccess: () => {
      toast.success('Job marked as complete');
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    },
    onError: () => {
      toast.error('Failed to complete job');
    },
  });
}
