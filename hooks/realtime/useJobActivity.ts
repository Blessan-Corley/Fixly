'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAblyChannel } from '@/contexts/AblyContext';
import { CHANNELS, EVENTS } from '@/lib/ably';
import { fetchWithCsrf } from '@/lib/api/fetchWithCsrf';

import type {
  JobApplicationItem,
  JobComment,
  JobRealtimeCountOptions,
  JobRealtimeCounts,
  JobUpdateItem,
  JobViewUpdate,
} from './types';
import { isValidIdentifier, toFiniteCount } from './utils';

export function useJobNotifications(jobId: string | null | undefined) {
  const [jobUpdates, setJobUpdates] = useState<JobUpdateItem[]>([]);
  const [comments, setComments] = useState<JobComment[]>([]);
  const [applications, setApplications] = useState<JobApplicationItem[]>([]);

  const validJobId = isValidIdentifier(jobId) ? jobId : null;

  useAblyChannel(
    validJobId ? CHANNELS.jobUpdates(validJobId) : null,
    EVENTS.JOB_STATUS_CHANGED,
    (message) => {
      const payload = (message.data || {}) as JobUpdateItem;
      setJobUpdates((prev) => [payload, ...prev.slice(0, 9)]);
    },
    [validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobComments(validJobId) : null,
    EVENTS.COMMENT_POSTED,
    (message) => {
      const payload = (message.data || {}) as JobComment;
      setComments((prev) => [payload, ...prev.slice(0, 49)]);
    },
    [validJobId]
  );

  useAblyChannel(
    validJobId ? CHANNELS.jobUpdates(validJobId) : null,
    EVENTS.APPLICATION_SUBMITTED,
    (message) => {
      const payload = (message.data || {}) as JobApplicationItem;
      setApplications((prev) => [payload, ...prev.slice(0, 19)]);
    },
    [validJobId]
  );

  return {
    jobUpdates,
    comments,
    applications,
    hasUpdates: jobUpdates.length > 0,
    hasNewComments: comments.length > 0,
    hasNewApplications: applications.length > 0,
  };
}

export function useJobRealtimeCounts(
  jobId: string | null | undefined,
  initialCounts: JobRealtimeCountOptions = {}
) {
  const validJobId = isValidIdentifier(jobId) ? jobId : null;
  const [counts, setCounts] = useState<JobRealtimeCounts>({
    applicationCount: toFiniteCount(initialCounts.applicationCount) ?? 0,
    commentCount: toFiniteCount(initialCounts.commentCount) ?? 0,
    viewCount: toFiniteCount(initialCounts.viewCount) ?? 0,
  });

  useEffect(() => {
    setCounts({
      applicationCount: toFiniteCount(initialCounts.applicationCount) ?? 0,
      commentCount: toFiniteCount(initialCounts.commentCount) ?? 0,
      viewCount: toFiniteCount(initialCounts.viewCount) ?? 0,
    });
  }, [
    initialCounts.applicationCount,
    initialCounts.commentCount,
    initialCounts.viewCount,
    validJobId,
  ]);

  useAblyChannel(
    validJobId ? CHANNELS.jobUpdates(validJobId) : null,
    EVENTS.JOB_UPDATED,
    (message) => {
      const payload = (message.data || {}) as JobViewUpdate;
      const nextViewCount = toFiniteCount(payload.viewCount);
      const nextCommentCount = toFiniteCount(payload.commentCount);
      const nextApplicationCount = toFiniteCount(payload.applicationCount);

      if (
        payload.type !== 'view_count' &&
        payload.type !== 'job_counts_updated' &&
        nextViewCount === null &&
        nextCommentCount === null &&
        nextApplicationCount === null
      ) {
        return;
      }

      setCounts((previousCounts) => ({
        applicationCount: nextApplicationCount ?? previousCounts.applicationCount,
        commentCount: nextCommentCount ?? previousCounts.commentCount,
        viewCount: nextViewCount ?? previousCounts.viewCount,
      }));
    },
    [validJobId]
  );

  return counts;
}

export function useJobViewCount(jobId: string | null | undefined) {
  const [viewCount, setViewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const validJobId = isValidIdentifier(jobId) ? jobId : null;

  useAblyChannel(
    validJobId ? CHANNELS.jobUpdates(validJobId) : null,
    EVENTS.JOB_UPDATED,
    (message) => {
      const payload = (message.data || {}) as JobViewUpdate;
      if (payload.type === 'view_count') {
        setViewCount(payload.viewCount || 0);
      }
    },
    [validJobId]
  );

  const trackView = useCallback(async () => {
    if (!validJobId) {
      return false;
    }

    try {
      setIsLoading(true);
      const response = await fetchWithCsrf(`/api/jobs/${validJobId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as { viewCount?: number };
      setViewCount(data.viewCount || 0);
      return true;
    } catch (error) {
      console.error('Failed to track view:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validJobId]);

  return {
    viewCount,
    isLoading,
    trackView,
  };
}
