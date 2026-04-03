'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';

import { queryKeys } from '../../lib/queryKeys';

import { fetcher, toError } from './shared';
import type { BaseEntity, QueryHookOptions, SessionUser } from './shared';

export const useEnvHealthQuery = (
  options: QueryHookOptions<BaseEntity, ReturnType<typeof queryKeys.admin.envHealth>> = {}
) => {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const { onSuccess, onError, ...queryOptions } = options;

  return useQuery({
    queryKey: queryKeys.admin.envHealth(),
    queryFn: async () => {
      try {
        const data = await fetcher<BaseEntity>('/api/admin/env-health');
        onSuccess?.(data);
        return data;
      } catch (error: unknown) {
        const normalizedError = toError(error);
        onError?.(normalizedError);
        throw normalizedError;
      }
    },
    enabled: user?.role === 'admin' || user?.isAdmin === true,
    staleTime: 1000 * 30,
    ...queryOptions,
  });
};
