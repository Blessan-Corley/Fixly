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
        : 'Failed to fetch dispute';
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as QueryResponse)
    : {};
}

export function useDisputeDetail(disputeId: string) {
  return useQuery({
    queryKey: queryKeys.disputes.detail(disputeId),
    queryFn: () => fetchJson(`/api/disputes/${disputeId}`),
    enabled: disputeId.length > 0,
    staleTime: 30_000,
  });
}

export function useDisputeList(filters: Filters = {}) {
  return useQuery({
    queryKey: queryKeys.disputes.list(filters),
    queryFn: () => {
      const params = toSearchParams(filters);
      return fetchJson(`/api/disputes?${params.toString()}`);
    },
    staleTime: 30_000,
  });
}

export function useSubmitDisputeResponse(disputeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responseData: unknown) => {
      return fetchJson(`/api/disputes/${disputeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseData),
      });
    },
    onSuccess: () => {
      toast.success('Response submitted');
      void queryClient.invalidateQueries({ queryKey: queryKeys.disputes.detail(disputeId) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit response');
    },
  });
}
