import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJobDetail, useJobs } from '@/lib/queries/jobs';

global.fetch = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useJobDetail()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches job detail successfully', async () => {
    const mockJob = { _id: 'job1', title: 'Fix sink', status: 'open' };
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockJob }),
    } as Response);

    const { result } = renderHook(() => useJobDetail('job1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual(mockJob);
  });

  it('is disabled when jobId is empty', () => {
    const { result } = renderHook(() => useJobDetail(''), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns error state on fetch failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed' }),
    } as Response);

    const { result } = renderHook(() => useJobDetail('job1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useJobs()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a jobs list with query params', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: [{ _id: 'job1', title: 'Fix sink' }] }),
    } as Response);

    const { result } = renderHook(
      () => useJobs({ search: 'sink', page: 2 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/jobs/browse?search=sink&page=2', undefined);
  });
});
