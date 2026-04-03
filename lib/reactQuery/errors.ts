import type { QueryKey } from '@tanstack/react-query';

import { analytics, EventTypes } from '../analytics-client';

export type GenericRecord = Record<string, unknown>;

export type QueryLike = {
  queryKey?: QueryKey;
};

export type MutationLike = {
  options?: {
    mutationKey?: QueryKey;
  };
};

export type ErrorWithResponse = Error & {
  code?: string;
  config?: { url?: string };
  response?: {
    status?: number;
    data?: { message?: string };
  };
};

export function asErrorWithResponse(error: unknown): ErrorWithResponse {
  return (error as ErrorWithResponse) ?? new Error('Unknown error');
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const normalized = asErrorWithResponse(error);
  return normalized.response?.data?.message ?? normalized.message ?? fallback;
}

export function containsBackgroundKey(queryKey: QueryKey | undefined): boolean {
  if (!Array.isArray(queryKey)) return false;
  const backgroundQueries = ['notifications', 'realtime-updates', 'analytics'];
  return queryKey.some((key) =>
    backgroundQueries.some((backgroundKey) => String(key).includes(backgroundKey))
  );
}

export function buildErrorHandler(toast: (msg: string) => void) {
  return (error: unknown, query?: QueryLike): void => {
    const normalized = asErrorWithResponse(error);

    void analytics.trackEvent(EventTypes.API_ERROR, {
      queryKey: query?.queryKey,
      errorMessage: normalized.message,
      errorCode: normalized.code ?? 'UNKNOWN',
      url: normalized.config?.url,
    });

    const errorMessage = getErrorMessage(error, 'An unexpected error occurred');

    if (!containsBackgroundKey(query?.queryKey)) {
      toast(errorMessage);
    }

    console.error('React Query Error:', {
      error: normalized,
      queryKey: query?.queryKey,
      timestamp: new Date().toISOString(),
    });
  };
}

export function buildSuccessHandler() {
  return (
    _data: unknown,
    variables: unknown,
    _context: unknown,
    mutation?: MutationLike
  ): void => {
    void analytics.trackEvent(EventTypes.USER_ACTION, {
      mutationKey: mutation?.options?.mutationKey,
      action: 'mutation_success',
      variables,
    });
  };
}
