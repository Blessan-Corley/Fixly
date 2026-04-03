'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type { BaseEntity, MutationHookOptions, QueryHookOptions } from './shared';

export const useUserReviewsQuery = (
  username?: string,
  params: Record<string, unknown> = {},
  options: QueryHookOptions<
    BaseEntity,
    readonly ['users', 'reviews', string, Record<string, unknown>]
  > = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.users.reviews(username ?? ''), params] as const,
    queryFn: async () => {
      try {
        const profile = await fetcher<BaseEntity>(`/api/user/profile/${username}`);
        const user = (profile.user ?? {}) as Record<string, unknown>;
        const userId = typeof user._id === 'string' ? user._id : '';
        if (!userId) {
          return { success: false, user: null, reviews: [] } as BaseEntity;
        }

        const pageValue = params.page;
        const limitValue = params.limit;
        const sortByValue = params.sortBy;
        const sortOrderValue = params.sortOrder;
        const reviewTypeValue = params.reviewType;
        const minRatingValue = params.minRating;
        const searchValue = params.search;

        const page: string | number =
          typeof pageValue === 'number' || typeof pageValue === 'string' ? pageValue : 1;
        const limit: string | number =
          typeof limitValue === 'number' || typeof limitValue === 'string' ? limitValue : 10;
        const sortBy: string =
          typeof sortByValue === 'string' && sortByValue.trim().length > 0
            ? sortByValue
            : 'createdAt';
        const sortOrder: string =
          typeof sortOrderValue === 'string' && sortOrderValue.trim().length > 0
            ? sortOrderValue
            : 'desc';
        const reviewType: string | undefined =
          typeof reviewTypeValue === 'string' ? reviewTypeValue : undefined;
        const minRating: string | number | undefined =
          typeof minRatingValue === 'string' || typeof minRatingValue === 'number'
            ? minRatingValue
            : undefined;
        const search: string | undefined = typeof searchValue === 'string' ? searchValue : undefined;

        const query = toSearchParams({
          userId,
          page,
          limit,
          sortBy,
          sortOrder,
          reviewType,
          minRating,
          search,
        });
        const reviews = await fetcher<BaseEntity>(`/api/reviews?${query.toString()}`);
        const merged = {
          success: true,
          user,
          reviews: reviews.reviews,
          ratingStats: reviews.ratingStats,
          pagination: reviews.pagination,
        };
        onSuccess?.(merged);
        return merged;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(username),
    ...queryOptions,
  });
};

export const useSubmitReviewMutation = (
  options: MutationHookOptions<BaseEntity, Record<string, unknown>> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: (payload) =>
      fetcher<BaseEntity>('/api/reviews/submit', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables, context) => {
      const username = typeof variables.username === 'string' ? variables.username : '';
      if (username) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.users.reviews(username) });
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};

type HelpfulPayload = {
  reviewId: string;
};

export const useMarkReviewHelpfulMutation = (
  options: MutationHookOptions<BaseEntity, HelpfulPayload> = {}
) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    mutationFn: ({ reviewId }) =>
      fetcher<BaseEntity>(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        body: JSON.stringify({ reviewId }),
      }),
    onSuccess: (data, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews.helpful(variables.reviewId) });
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      onError?.(error, variables, context);
    },
    ...mutationOptions,
  });
};
