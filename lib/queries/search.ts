import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './keys';

type Filters = Record<string, unknown>;
type QueryResponse = Record<string, unknown>;
type UseSearchOptions = {
  enabled?: boolean;
};

function toSearchParams(filters: Filters = {}): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','));
      }
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

async function fetchSearch(query: string, filters: Filters = {}): Promise<QueryResponse> {
  const params = toSearchParams({ ...filters, q: query });
  const response = await fetch(`/api/jobs/browse?${params.toString()}`);
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Search failed';
    throw new Error(message);
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as QueryResponse)
    : {};
}

export function useSearch(query: string, filters: Filters = {}, options: UseSearchOptions = {}) {
  const effectiveEnabled =
    options.enabled ?? (query.trim().length >= 2 || Object.keys(filters).length > 0);

  return useQuery({
    queryKey: queryKeys.search.results(query, filters),
    queryFn: () => fetchSearch(query, filters),
    enabled: effectiveEnabled,
    staleTime: 30_000,
  });
}
