'use client';

import type { Session } from 'next-auth';
import { useMemo } from 'react';


import { getRecordId } from '../_lib/jobDetails.normalizers';
import type { JobDetails, ReviewItem } from '../_lib/jobDetails.types';

type JobDetailsPermissionsParams = {
  job: JobDetails | null;
  session: Session | null;
  sessionUserId: string;
  viewerRole: string | undefined;
  hasApplied: boolean;
  reviews: ReviewItem[];
};

export type JobDetailsPermissions = {
  canSeeLocation: boolean;
  canWriteReview: boolean;
  hasUserReview: boolean;
  canFileDispute: boolean;
  canCompleteJob: boolean;
};

export function useJobDetailsPermissions({
  job,
  session,
  sessionUserId,
  viewerRole,
  hasApplied,
  reviews,
}: JobDetailsPermissionsParams): JobDetailsPermissions {
  const isJobInvolvementUser = useMemo<boolean>(() => {
    if (!job || !sessionUserId) return false;
    return sessionUserId === job.hirerId || sessionUserId === getRecordId(job.fixer?.id);
  }, [job, sessionUserId]);

  const canSeeLocation = useMemo<boolean>(() => {
    if (!job) return false;
    return hasApplied || sessionUserId === job.hirerId;
  }, [hasApplied, job, sessionUserId]);

  const canWriteReview = useMemo<boolean>(() => {
    if (!session || !job) return false;
    return (
      sessionUserId === getRecordId(job.client?.id) || sessionUserId === getRecordId(job.fixer?.id)
    );
  }, [job, session, sessionUserId]);

  const hasUserReview = useMemo<boolean>(
    () => reviews.some((review) => review.reviewerId === sessionUserId),
    [reviews, sessionUserId]
  );

  const canFileDispute = Boolean(
    session && isJobInvolvementUser && ['in_progress', 'completed', 'disputed'].includes(job?.status ?? '')
  );

  const canCompleteJob = Boolean(
    session && viewerRole === 'hirer' && sessionUserId === job?.hirerId && job?.status === 'in_progress'
  );

  return { canSeeLocation, canWriteReview, hasUserReview, canFileDispute, canCompleteJob };
}
