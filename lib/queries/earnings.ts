import { useQuery } from '@tanstack/react-query';

import { queryKeys } from './keys';

type Filters = Record<string, unknown>;

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

export function useEarnings(filters: Filters = {}) {
  return useQuery({
    queryKey: queryKeys.earnings.list(filters),
    queryFn: async () => {
      const params = toSearchParams(filters);
      const response = await fetch(`/api/user/earnings?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }
      return response.json();
    },
    staleTime: 60_000,
  });
}
