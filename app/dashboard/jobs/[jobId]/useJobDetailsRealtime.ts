'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';

import { useAblyChannel } from '@/contexts/AblyContext';
import { useJobRealtimeCounts } from '@/hooks/realtime/useJobActivity';
import { CHANNELS, EVENTS } from '@/lib/ably';

import type { JobApplication, JobComment, JobDetails } from './page.types';

type UseJobDetailsRealtimeParams = {
  jobId: string;
  job: JobDetails | null;
  setJob: Dispatch<SetStateAction<JobDetails | null>>;
  applications: JobApplication[];
  comments: JobComment[];
  refreshApplications: () => void;
  refreshComments: () => void;
  refreshJobAndApplications: () => void;
};

export function useJobDetailsRealtime({
  jobId,
  job,
  setJob,
  applications,
  comments,
  refreshApplications,
  refreshComments,
  refreshJobAndApplications,
}: UseJobDetailsRealtimeParams): void {
  const realtimeCounts = useJobRealtimeCounts(jobId, {
    applicationCount: job?.applicationCount ?? applications.length,
    commentCount: job?.commentCount ?? comments.length,
    viewCount: job?.views?.count ?? 0,
  });

  useEffect(() => {
    setJob((previousJob) => {
      if (!previousJob) return previousJob;

      const previousViewCount = previousJob.views?.count ?? 0;
      const previousApplicationCount = previousJob.applicationCount ?? 0;
      const previousCommentCount = previousJob.commentCount ?? 0;

      if (
        previousViewCount === realtimeCounts.viewCount &&
        previousApplicationCount === realtimeCounts.applicationCount &&
        previousCommentCount === realtimeCounts.commentCount
      ) {
        return previousJob;
      }

      return {
        ...previousJob,
        applicationCount: realtimeCounts.applicationCount,
        commentCount: realtimeCounts.commentCount,
        views: { ...previousJob.views, count: realtimeCounts.viewCount },
      };
    });

    if (realtimeCounts.applicationCount !== applications.length) refreshApplications();
    if (realtimeCounts.commentCount !== comments.length) refreshComments();
  }, [
    applications.length,
    comments.length,
    refreshApplications,
    refreshComments,
    realtimeCounts.applicationCount,
    realtimeCounts.commentCount,
    realtimeCounts.viewCount,
    setJob,
  ]);

  useAblyChannel(
    jobId ? CHANNELS.jobUpdates(jobId) : null,
    EVENTS.APPLICATION_SUBMITTED,
    refreshApplications,
    [jobId, refreshApplications]
  );

  useAblyChannel(
    jobId ? CHANNELS.jobUpdates(jobId) : null,
    EVENTS.APPLICATION_ACCEPTED,
    refreshApplications,
    [jobId, refreshApplications]
  );

  useAblyChannel(
    jobId ? CHANNELS.jobUpdates(jobId) : null,
    EVENTS.APPLICATION_REJECTED,
    refreshApplications,
    [jobId, refreshApplications]
  );

  useAblyChannel(
    jobId ? CHANNELS.jobUpdates(jobId) : null,
    EVENTS.JOB_STATUS_CHANGED,
    refreshJobAndApplications,
    [jobId, refreshJobAndApplications]
  );
}
