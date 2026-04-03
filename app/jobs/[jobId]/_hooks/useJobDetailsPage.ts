'use client';

import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

import { useJobRealtimeCounts } from '@/hooks/realtime/useJobActivity';
import {
  useApplyToJob,
  useCompleteJob,
  useJobApplications,
  useJobDetail,
  useJobReviews,
} from '@/lib/queries/jobs';

import {
  asBoolean,
  asString,
  normalizeJob,
  normalizeReviews,
} from '../_lib/jobDetails.normalizers';
import type {
  JobApiPayload,
  JobDetails,
  ReviewItem,
  ReviewsApiPayload,
} from '../_lib/jobDetails.types';

import { type JobDetailsActionsState, useJobDetailsActions } from './useJobDetailsActions';
import { type JobDetailsPermissions, useJobDetailsPermissions } from './useJobDetailsPermissions';
import { useJobDetailsRealtime } from './useJobDetailsRealtime';

export type JobDetailsPageState = {
  job: JobDetails | null;
  reviews: ReviewItem[];
  loading: boolean;
  error: string | null;
  loadingReviews: boolean;
  completingJob: boolean;
  sessionUserId: string;
  viewerRole: string | undefined;
} & JobDetailsActionsState & JobDetailsPermissions;

export function useJobDetailsPage(safeJobId: string): JobDetailsPageState {
  const { data: session } = useSession();

  const sessionUserId = asString(session?.user?.id);
  const viewerRole = typeof session?.user?.role === 'string' ? session.user.role : undefined;

  const [trackedViewCount, setTrackedViewCount] = useState<number | null>(null);

  const { mutateAsync: applyToJob } = useApplyToJob(safeJobId);
  const { mutateAsync: completeJob, isPending: completingJob } = useCompleteJob(safeJobId);
  const {
    data: jobResponse,
    isLoading: loading,
    error: jobError,
    refetch: refetchJobDetail,
  } = useJobDetail(safeJobId);

  useJobApplications(safeJobId);

  const realtimeCounts = useJobRealtimeCounts(safeJobId || null, {
    commentCount:
      jobResponse && typeof jobResponse === 'object' && 'job' in jobResponse
        ? normalizeJob(jobResponse.job)?.commentsCount ?? 0
        : 0,
    applicationCount:
      jobResponse && typeof jobResponse === 'object' && 'job' in jobResponse
        ? normalizeJob(jobResponse.job)?.applicationCount ?? 0
        : 0,
    viewCount:
      jobResponse && typeof jobResponse === 'object' && 'job' in jobResponse
        ? normalizeJob(jobResponse.job)?.viewsCount ?? 0
        : 0,
  });

  const realtimeViewCount = typeof realtimeCounts.viewCount === 'number' ? realtimeCounts.viewCount : 0;
  const realtimeCommentCount = typeof realtimeCounts.commentCount === 'number' ? realtimeCounts.commentCount : 0;
  const realtimeApplicationCount = typeof realtimeCounts.applicationCount === 'number' ? realtimeCounts.applicationCount : 0;

  const baseJob = useMemo<JobDetails | null>(() => {
    if (!jobResponse || typeof jobResponse !== 'object' || !('job' in jobResponse)) return null;
    return normalizeJob((jobResponse as JobApiPayload).job);
  }, [jobResponse]);

  const job = useMemo<JobDetails | null>(() => {
    if (!baseJob) return null;
    return {
      ...baseJob,
      viewsCount: trackedViewCount ?? (realtimeViewCount > 0 ? realtimeViewCount : baseJob.viewsCount),
      commentsCount: realtimeCommentCount,
      applicationCount: realtimeApplicationCount,
    };
  }, [baseJob, realtimeApplicationCount, realtimeCommentCount, realtimeViewCount, trackedViewCount]);

  const { data: reviewsResponse, isLoading: loadingReviews } = useJobReviews(
    safeJobId,
    job?.status === 'completed'
  );

  const reviews = useMemo<ReviewItem[]>(() => {
    const payload = (reviewsResponse ?? {}) as ReviewsApiPayload;
    if (!asBoolean(payload.success)) return [];
    return normalizeReviews(payload.data ?? payload.reviews);
  }, [reviewsResponse]);

  const error = !safeJobId ? 'Invalid job id' : jobError instanceof Error ? jobError.message : null;

  const permissions = useJobDetailsPermissions({
    job,
    session,
    sessionUserId,
    viewerRole,
    hasApplied: false, // will be overridden by actions
    reviews,
  });

  const actions = useJobDetailsActions({
    safeJobId,
    session,
    sessionUserId,
    job,
    applyToJob,
    completeJob,
    hasUserReview: permissions.hasUserReview,
    refetchJobDetail: () => { void refetchJobDetail(); },
  });

  // Re-compute permissions with the real hasApplied value from actions
  const finalPermissions = useJobDetailsPermissions({
    job,
    session,
    sessionUserId,
    viewerRole,
    hasApplied: actions.hasApplied,
    reviews,
  });

  useJobDetailsRealtime({ safeJobId, sessionUserId, session, setTrackedViewCount });

  return {
    job,
    reviews,
    loading,
    error,
    loadingReviews,
    completingJob,
    sessionUserId,
    viewerRole,
    ...actions,
    ...finalPermissions,
  };
}
