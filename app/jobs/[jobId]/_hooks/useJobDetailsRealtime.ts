'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { Session } from 'next-auth';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';


import {
  Channels,
  Events,
  type ApplicationSubmittedPayload,
} from '@/lib/ably/events';
import { useAblyEvent } from '@/lib/ably/hooks';
import { queryKeys } from '@/lib/queries/keys';

type JobDetailsRealtimeParams = {
  safeJobId: string;
  sessionUserId: string;
  session: Session | null;
  setTrackedViewCount: (count: number) => void;
};

export function useJobDetailsRealtime({
  safeJobId,
  sessionUserId,
  session,
  setTrackedViewCount,
}: JobDetailsRealtimeParams): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!safeJobId || !sessionUserId) return;

    fetch(`/api/jobs/${safeJobId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (trackResponse) => {
        const payload = (await trackResponse.json().catch(() => ({}))) as { viewCount?: unknown };
        const nextViewCount = typeof payload.viewCount === 'number' ? payload.viewCount : null;
        if (!trackResponse.ok || nextViewCount === null) return;
        setTrackedViewCount(nextViewCount);
      })
      .catch(() => {
        // Ignore analytics failures.
      });
  }, [safeJobId, sessionUserId, setTrackedViewCount]);

  useAblyEvent(
    safeJobId ? Channels.job(safeJobId) : '',
    Events.job.statusChanged,
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(safeJobId) });
    }, [queryClient, safeJobId]),
    Boolean(safeJobId)
  );

  useAblyEvent(
    safeJobId ? Channels.job(safeJobId) : '',
    Events.job.applicationSubmitted,
    useCallback(
      (message) => {
        const payload =
          message.data && typeof message.data === 'object'
            ? (message.data as ApplicationSubmittedPayload)
            : null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.applications(safeJobId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(safeJobId) });
        if (payload?.fixerName && session?.user?.role === 'hirer') {
          toast(`${payload.fixerName} applied to your job`);
        }
      },
      [queryClient, safeJobId, session?.user?.role]
    ),
    Boolean(safeJobId)
  );

  useAblyEvent(
    safeJobId ? Channels.job(safeJobId) : '',
    Events.job.reviewPosted,
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.reviews(safeJobId) });
    }, [queryClient, safeJobId]),
    Boolean(safeJobId)
  );
}
