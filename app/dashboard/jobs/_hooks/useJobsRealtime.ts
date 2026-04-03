'use client';

import { useCallback, useEffect, useMemo } from 'react';

import { asNumber, asString, isRecord } from '@/app/dashboard/jobs/_lib/jobs.helpers';
import type { DashboardJob, JobRealtimePayload } from '@/app/dashboard/jobs/_lib/jobs.types';
import { useAbly } from '@/contexts/AblyContext';
import { CHANNELS, EVENTS } from '@/lib/ably';
import { Channels as TypedChannels, Events as TypedEvents } from '@/lib/ably/events';
import { useAblyChannel as useTypedAblyChannel } from '@/lib/ably/hooks';

type UseJobsRealtimeParams = {
  jobs: DashboardJob[];
  setJobs: React.Dispatch<React.SetStateAction<DashboardJob[]>>;
  fetchJobs: (params: { reset: boolean; page: number }) => Promise<void>;
};

export function useJobsRealtime({ jobs, setJobs, fetchJobs }: UseJobsRealtimeParams): void {
  const { subscribeToChannel } = useAbly();

  const realtimeJobIds = useMemo(
    () =>
      jobs
        .map((job) => job._id)
        .filter((id) => id.length > 0)
        .sort()
        .join(','),
    [jobs]
  );

  useEffect(() => {
    if (!realtimeJobIds) return;

    let isActive = true;
    const cleanups: Array<() => void> = [];
    const uniqueJobIds = Array.from(new Set(realtimeJobIds.split(',').filter(Boolean)));

    const subscribeToJobs = async (): Promise<void> => {
      for (const jobId of uniqueJobIds) {
        const cleanup = await subscribeToChannel(
          CHANNELS.jobUpdates(jobId),
          EVENTS.JOB_UPDATED,
          (message) => {
            const payload = isRecord(message.data) ? (message.data as JobRealtimePayload) : {};
            const nextApplicationCount = asNumber(payload.applicationCount);
            const nextViewCount = asNumber(payload.viewCount);

            if (nextApplicationCount === null && nextViewCount === null) return;

            setJobs((previousJobs) =>
              previousJobs.map((job) => {
                if (job._id !== jobId) return job;

                const resolvedApplicationCount = nextApplicationCount ?? job.applicationCount;
                const resolvedViewCount = nextViewCount ?? job.views.count;

                if (
                  resolvedApplicationCount === job.applicationCount &&
                  resolvedViewCount === job.views.count
                ) {
                  return job;
                }

                return {
                  ...job,
                  applicationCount: resolvedApplicationCount,
                  views: { ...job.views, count: resolvedViewCount },
                };
              })
            );
          }
        );

        if (!isActive) {
          cleanup();
          continue;
        }
        cleanups.push(cleanup);

        const statusCleanup = await subscribeToChannel(
          CHANNELS.jobUpdates(jobId),
          EVENTS.JOB_STATUS_CHANGED,
          (message) => {
            const payload = isRecord(message.data) ? (message.data as JobRealtimePayload) : {};
            const nextStatus = asString(payload.newStatus) || asString(payload.status);
            if (!nextStatus) return;

            setJobs((previousJobs) =>
              previousJobs.map((job) =>
                job._id === jobId && job.status !== nextStatus
                  ? { ...job, status: nextStatus }
                  : job
              )
            );
          }
        );

        if (!isActive) {
          statusCleanup();
          continue;
        }
        cleanups.push(statusCleanup);
      }
    };

    void subscribeToJobs();

    return () => {
      isActive = false;
      cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.error('Error cleaning up job count subscription:', error);
        }
      });
    };
  }, [realtimeJobIds, subscribeToChannel, setJobs]);

  useTypedAblyChannel(
    TypedChannels.marketplace,
    useCallback(
      (message) => {
        if (
          message.name === TypedEvents.marketplace.jobPosted ||
          message.name === TypedEvents.marketplace.jobUpdated ||
          message.name === TypedEvents.marketplace.jobClosed
        ) {
          void fetchJobs({ reset: true, page: 1 });
        }
      },
      [fetchJobs]
    )
  );
}
