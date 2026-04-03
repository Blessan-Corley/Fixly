import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from './keys';

type Filters = Record<string, unknown>;
type QueryResponse = Record<string, unknown>;

function toSearchParams(filters: Filters = {}): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<QueryResponse> {
  const response = await fetch(url, init);
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Failed to fetch admin data';
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as QueryResponse)
    : {};
}

export function useAdminMetrics(range = '30d') {
  return useQuery({
    queryKey: [...queryKeys.admin.metrics, range] as const,
    queryFn: () => fetchJson(`/api/admin/dashboard?range=${encodeURIComponent(range)}`),
    staleTime: 60_000,
  });
}

export function useAdminUsers(filters: Filters = {}) {
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => {
      const params = toSearchParams(filters);
      return fetchJson(`/api/admin/users?${params.toString()}`);
    },
    staleTime: 30_000,
  });
}

export function useAdminJobs(filters: Filters = {}) {
  return useQuery({
    queryKey: queryKeys.admin.jobs(filters),
    queryFn: () => {
      const params = toSearchParams(filters);
      return fetchJson(`/api/admin/jobs?${params.toString()}`);
    },
    staleTime: 30_000,
  });
}

export function useAdminVerificationQueue(status = 'pending') {
  return useQuery({
    queryKey: queryKeys.admin.verificationQueue(status),
    queryFn: () => fetchJson(`/api/admin/verification?status=${encodeURIComponent(status)}`),
    staleTime: 30_000,
  });
}

export function useRefreshAdminMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => fetchJson('/api/admin/dashboard?refresh=true'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.metrics });
    },
  });
}

export function useAdminVerificationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      action,
      rejectionReason = '',
    }: {
      userId: string;
      action: string;
      rejectionReason?: string;
    }) =>
      fetchJson('/api/admin/verification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, rejectionReason }),
      }),
    onSuccess: (_data, variables) => {
      toast.success(`Verification ${variables.action}ed successfully`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.verificationQueue() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
    onError: (error, variables) => {
      toast.error(
        error instanceof Error ? error.message : `Failed to ${variables.action} verification`
      );
    },
  });
}

export function useAdminUserAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) =>
      fetchJson(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
      }),
    onSuccess: (_data, variables) => {
      toast.success(`User ${variables.action} successfully`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.jobs() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.metrics });
    },
    onError: (error, variables) => {
      toast.error(error instanceof Error ? error.message : `Failed to ${variables.action} user`);
    },
  });
}
