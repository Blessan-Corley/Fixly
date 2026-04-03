import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotifications } from '@/lib/queries/notifications';
import { useNotificationStore } from '@/lib/stores/notificationStore';

global.fetch = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.getState().setNotifications([]);
  });

  it('returns notifications on successful fetch', async () => {
    const mockData = {
      notifications: [{ _id: '1', title: 'Test', read: false }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(useNotificationStore.getState().notifications).toEqual(mockData.notifications);
  });

  it('returns error state on fetch failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'nope' }),
    } as Response);

    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
