import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './keys';

type QueryResponse = Record<string, unknown>;

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
        : 'Request failed';
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as QueryResponse)
    : {};
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.me,
    queryFn: async () => fetchJson('/api/user/profile'),
    staleTime: 5 * 60_000,
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.publicProfile(userId),
    queryFn: async () => fetchJson(`/api/users/${userId}/public`),
    enabled: userId.length > 0,
    staleTime: 2 * 60_000,
  });
}

export function usePublicProfileByUsername(username: string) {
  return useQuery({
    queryKey: queryKeys.users.publicProfileByUsername(username),
    queryFn: async () => fetchJson(`/api/user/profile/${username}`),
    enabled: username.length > 0,
    staleTime: 2 * 60_000,
  });
}

export function useUserReviews(userId: string, filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [...queryKeys.users.reviews(userId), filters] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }
        params.set(key, String(value));
      });

      return fetchJson(`/api/users/${userId}/reviews?${params.toString()}`);
    },
    enabled: userId.length > 0,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: unknown) => {
      return fetchJson('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
    },
  });
}
