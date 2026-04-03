import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { analytics, EventTypes } from '../analytics-client';

import {
  asErrorWithResponse,
  buildErrorHandler,
  buildSuccessHandler,
  getErrorMessage,
  type GenericRecord,
  type MutationLike,
} from './errors';

const errorHandler = buildErrorHandler(toast.error);

const queryCache = new QueryCache({
  onError: errorHandler as (error: Error, query: unknown) => void,
});

const mutationCache = new MutationCache({
  onSuccess: buildSuccessHandler() as (
    data: unknown,
    variables: unknown,
    context: unknown,
    mutation: unknown
  ) => void,
  onError: (error, variables, _context, mutation) => {
    void analytics.trackEvent(EventTypes.API_ERROR, {
      mutationKey: (mutation as MutationLike | undefined)?.options?.mutationKey,
      action: 'mutation_error',
      errorMessage: asErrorWithResponse(error).message,
      variables: (variables as GenericRecord | undefined) ?? {},
    });

    toast.error(getErrorMessage(error, 'Operation failed'));
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 5,
      retry: (failureCount, error) => {
        const normalized = asErrorWithResponse(error);
        if (normalized.response?.status === 401 || normalized.response?.status === 403) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: 'online',
      throwOnError: false,
      structuralSharing: true,
      experimental_prefetchInRender: true,
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
      throwOnError: false,
    },
  },
});
