'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { analytics, EventTypes } from '../../lib/analytics-client';
import { queryKeys } from '../../lib/queryKeys';

import { fetcher, toError, toSearchParams } from './shared';
import type {
  BaseEntity,
  QueryHookOptions,
  QueryParams,
  SearchResponse,
  SessionUser,
} from './shared';

export const useSearch = (
  query: string,
  filters: QueryParams = {},
  options: QueryHookOptions<SearchResponse, ReturnType<typeof queryKeys.search.results>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.search.results(query, filters),
    queryFn: async () => {
      try {
        const params = toSearchParams({
          q: query,
          ...filters,
        });
        const data = await fetcher<SearchResponse>(`/api/jobs/browse?${params.toString()}`);
        analytics.trackEvent(EventTypes.SEARCH, {
          query,
          filters,
          resultCount: data?.results?.length || 0,
          userId: user?.id,
        });
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(query && query.length >= 2),
    staleTime: 1000 * 60 * 3,
    ...queryOptions,
  });
};

export const useSearchSuggestions = (
  query: string,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.search.suggestions>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.search.suggestions(query),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>(
          `/api/search/suggestions?q=${encodeURIComponent(query)}`
        );
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(query && query.length >= 2),
    staleTime: 1000 * 60 * 10,
    ...queryOptions,
  });
};

export const useLocationSearch = (
  coordinates: { lat?: number; lng?: number } | null | undefined,
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.search.location>> = {}
) => {
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.search.location(coordinates),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/location/reverse-geocode', {
          method: 'POST',
          body: JSON.stringify({
            lat: coordinates?.lat,
            lng: coordinates?.lng,
          }),
        });
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: Boolean(coordinates?.lat && coordinates?.lng),
    staleTime: 1000 * 60 * 60,
    ...queryOptions,
  });
};
