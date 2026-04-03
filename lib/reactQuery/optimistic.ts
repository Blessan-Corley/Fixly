import { queryKeys } from '../queryKeys';

import { queryClient } from './client';
import type { GenericRecord } from './errors';

type JobData = {
  _id?: string;
  location?: {
    city?: string;
    state?: string;
  };
  skillsRequired?: string[];
  applications?: unknown[];
  applicationCount?: number;
};

type UserProfile = GenericRecord;

function toSearchParams(input: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          params.append(key, String(item));
        }
      });
      return;
    }

    if (typeof value === 'object') return;

    params.set(key, String(value));
  });
  return params;
}

export const optimisticUpdates = {
  applyToJob: (jobId: string, application: GenericRecord): void => {
    queryClient.setQueryData(queryKeys.jobs.detail(jobId), (oldData: JobData | undefined) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        applications: [...(oldData.applications ?? []), application],
        applicationCount: (oldData.applicationCount ?? 0) + 1,
      };
    });
  },

  addComment: (jobId: string, comment: GenericRecord): void => {
    queryClient.setQueryData(
      queryKeys.jobs.comments(jobId),
      (oldData: GenericRecord[] | undefined) => {
        if (!oldData) return [comment];
        return [comment, ...oldData];
      }
    );
  },

  updateProfile: (userId: string, updates: GenericRecord): void => {
    queryClient.setQueryData(
      queryKeys.users.profile(userId),
      (oldData: UserProfile | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, ...updates };
      }
    );
  },
};

export const prefetchHelpers = {
  prefetchRelatedJobs: async (currentJob: JobData): Promise<void> => {
    const relatedFilters = {
      skills: currentJob.skillsRequired?.slice(0, 3) ?? [],
      city: currentJob.location?.city ?? '',
      state: currentJob.location?.state ?? '',
      exclude: currentJob._id ?? '',
    };

    await queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.browse(relatedFilters),
      queryFn: async () => {
        const query = toSearchParams(relatedFilters);
        const response = await fetch(`/api/jobs/browse?${query.toString()}`);
        return response.json();
      },
      staleTime: 1000 * 60 * 10,
    });
  },

  prefetchSearchSuggestions: async (query: string): Promise<void> => {
    if (query.length < 2) return;

    await queryClient.prefetchQuery({
      queryKey: queryKeys.search.suggestions(query),
      queryFn: async () => {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
        return response.json();
      },
      staleTime: 1000 * 60 * 5,
    });
  },
};
