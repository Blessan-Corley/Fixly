'use client';

import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';
import type {
  InfiniteData,
  QueryKey,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;
export type BaseEntity = Record<string, unknown>;

export type JobsResponse = {
  jobs?: BaseEntity[];
  hasMore?: boolean;
  currentPage?: number;
  [key: string]: unknown;
};

export type JobResponse = {
  _id?: string;
  title?: string;
  category?: string;
  budget?: {
    amount?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type SearchResponse = {
  results?: BaseEntity[];
  [key: string]: unknown;
};

export type QueryHookOptions<TData, TQueryKey extends QueryKey> = Omit<
  UseQueryOptions<TData, Error, TData, TQueryKey>,
  'queryKey' | 'queryFn'
> & {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
};

export type InfiniteQueryHookOptions<TPageData, TQueryKey extends QueryKey> = Omit<
  UseInfiniteQueryOptions<TPageData, Error, InfiniteData<TPageData, number>, TQueryKey, number>,
  'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
> & {
  getNextPageParam?: (
    lastPage: TPageData,
    allPages: TPageData[],
    lastPageParam: number,
    allPageParams: number[]
  ) => number | undefined | null;
  onSuccess?: (pageData: TPageData) => void;
  onError?: (error: Error) => void;
};

export type MutationHookOptions<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, Error, TVariables, TContext>,
  'mutationFn' | 'onMutate' | 'onSuccess' | 'onError'
> & {
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void;
  onError?: (error: Error, variables: TVariables, context?: TContext) => void;
};

export type SessionUser = {
  id?: string;
  isAdmin?: boolean;
  role?: string;
  [key: string]: unknown;
};

export const toSearchParams = (params: QueryParams = {}): URLSearchParams => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  return searchParams;
};

export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error('Unknown error');
};

export const fetcher = async <T = unknown>(
  url: string,
  options: RequestInit & { headers?: HeadersInit } = {}
): Promise<T> => {
  const response = await fetchWithCsrf(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorPayload = (await response
      .json()
      .catch(() => ({ message: 'Network error' }))) as
      | { message?: string; error?: { message?: string } }
      | undefined;
    throw new Error(errorPayload?.error?.message || errorPayload?.message || `HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { success?: boolean; data?: T } | T;

  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    (payload as { success?: boolean }).success === true &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }

  return payload as T;
};
