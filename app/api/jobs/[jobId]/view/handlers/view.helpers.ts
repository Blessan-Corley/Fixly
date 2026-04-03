import mongoose from 'mongoose';

import Job from '@/models/Job';
import { countActiveApplicationsOnJob } from '@/models/job/workflow';
import JobView from '@/models/JobView';

import type {
  DailyViewAggregate,
  LegacyDailyViewEntry,
  TrackableJobProjection,
  TrackViewResult,
} from './view.types';

export function getClientIpAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export function getUtcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getViewCount(job: TrackableJobProjection | null | undefined): number {
  const rawValue = job?.views?.count;
  return typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0;
}

export function getCommentCount(job: TrackableJobProjection | null | undefined): number {
  return Array.isArray(job?.comments) ? job.comments.length : 0;
}

export function getApplicationCount(job: TrackableJobProjection | null | undefined): number {
  return countActiveApplicationsOnJob({
    applications: Array.isArray(job?.applications) ? job.applications : [],
  });
}

export function isTransactionUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('transaction support is not available') ||
    message.includes('replica set')
  );
}

export function mergeDailyViews(
  legacyDailyViews: LegacyDailyViewEntry[] | null | undefined,
  realtimeDailyViews: DailyViewAggregate[]
): Array<{ date: string; count: number }> {
  const merged = new Map<string, number>();

  if (Array.isArray(legacyDailyViews)) {
    for (const entry of legacyDailyViews) {
      const date = typeof entry?.date === 'string' ? entry.date : '';
      const count =
        typeof entry?.count === 'number' && Number.isFinite(entry.count) ? entry.count : 0;
      if (!date) continue;
      merged.set(date, (merged.get(date) ?? 0) + count);
    }
  }

  for (const entry of realtimeDailyViews) {
    const date = typeof entry._id === 'string' ? entry._id : '';
    const count =
      typeof entry.count === 'number' && Number.isFinite(entry.count) ? entry.count : 0;
    if (!date) continue;
    merged.set(date, (merged.get(date) ?? 0) + count);
  }

  return Array.from(merged.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, count]) => ({ date, count }));
}

export async function fetchTrackableJob(
  jobId: string,
  session?: mongoose.ClientSession
): Promise<TrackableJobProjection | null> {
  let query = Job.findById(jobId).select(
    'createdBy views.count views.uniqueViewers views.dailyViews applications.status comments._id'
  );
  if (session) query = query.session(session);
  return query.lean<TrackableJobProjection | null>();
}

export async function trackJobViewWithoutTransaction(
  jobId: string,
  userId: string,
  ipAddress: string,
  userAgent: string,
  now: Date
): Promise<TrackViewResult | null> {
  const job = await fetchTrackableJob(jobId);
  if (!job) return null;

  const commentCount = getCommentCount(job);
  const applicationCount = getApplicationCount(job);
  const currentViewCount = getViewCount(job);

  if (String(job.createdBy || '') === userId) {
    return { applicationCount, commentCount, viewCount: currentViewCount, viewTracked: false };
  }

  const viewedOn = getUtcDateKey(now);
  const writeResult = await JobView.updateOne(
    { job: jobId, user: userId, viewedOn },
    {
      $setOnInsert: {
        job: jobId,
        user: userId,
        viewedOn,
        viewedAt: now,
        ipAddress,
        userAgent,
      },
    },
    { upsert: true }
  );

  if (writeResult.upsertedCount === 0) {
    return { applicationCount, commentCount, viewCount: currentViewCount, viewTracked: false };
  }

  const updatedJob = await Job.findByIdAndUpdate(
    jobId,
    { $inc: { 'views.count': 1 } },
    { new: true, projection: { 'views.count': 1 } }
  ).lean<TrackableJobProjection | null>();

  return {
    applicationCount,
    commentCount,
    viewCount: getViewCount(updatedJob) || currentViewCount + 1,
    viewTracked: true,
  };
}

export async function trackJobViewAtomically(
  jobId: string,
  userId: string,
  ipAddress: string,
  userAgent: string,
  now: Date
): Promise<TrackViewResult | null> {
  const dbSession = await mongoose.startSession();
  let result: TrackViewResult | null = null;

  try {
    await dbSession.withTransaction(async () => {
      const job = await fetchTrackableJob(jobId, dbSession);
      if (!job) return;

      const commentCount = getCommentCount(job);
      const applicationCount = getApplicationCount(job);
      const currentViewCount = getViewCount(job);

      if (String(job.createdBy || '') === userId) {
        result = { applicationCount, commentCount, viewCount: currentViewCount, viewTracked: false };
        return;
      }

      const viewedOn = getUtcDateKey(now);
      const writeResult = await JobView.updateOne(
        { job: jobId, user: userId, viewedOn },
        {
          $setOnInsert: {
            job: jobId,
            user: userId,
            viewedOn,
            viewedAt: now,
            ipAddress,
            userAgent,
          },
        },
        { session: dbSession, upsert: true }
      );

      if (writeResult.upsertedCount === 0) {
        result = { applicationCount, commentCount, viewCount: currentViewCount, viewTracked: false };
        return;
      }

      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { $inc: { 'views.count': 1 } },
        { new: true, projection: { 'views.count': 1 }, session: dbSession }
      ).lean<TrackableJobProjection | null>();

      result = {
        applicationCount,
        commentCount,
        viewCount: getViewCount(updatedJob) || currentViewCount + 1,
        viewTracked: true,
      };
    });

    return result;
  } finally {
    await dbSession.endSession();
  }
}
