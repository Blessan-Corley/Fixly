import { logger } from '@/lib/logger';
import { invalidateUserCache } from '@/lib/redisCache';
import JobDraft from '@/models/JobDraft';
import User from '@/models/User';

import { invalidateDashboardStatsCache } from './dashboardStatsService';
import type { JobPostRecord } from './jobs/createJob';

type JobPostSideEffectOptions = {
  draftId?: string | null;
};

async function updateUserAfterJobPost(userId: string, job: JobPostRecord): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    return;
  }

  user.lastJobPostedAt = new Date();
  user.jobsPosted = Number(user.jobsPosted || 0) + 1;
  user.lastActivityAt = new Date();
  await user.save();

  if (typeof user.addNotification === 'function') {
    await user.addNotification(
      'job_posted',
      'Job Posted Successfully',
      `Your job "${job.title || 'Untitled job'}" has been posted and is now visible to fixers.`
    );
  }
}

async function convertDraftIfNeeded(
  jobId: string,
  userId: string,
  draftId?: string | null
): Promise<void> {
  if (!draftId) {
    return;
  }

  const draft = await JobDraft.findOne({
    _id: draftId,
    createdBy: userId,
  });

  if (draft && typeof draft.convertToJob === 'function') {
    await draft.convertToJob(jobId);
  }
}

async function invalidateJobPostCaches(userId: string): Promise<void> {
  await Promise.allSettled([invalidateDashboardStatsCache(userId), invalidateUserCache(userId)]);
}

async function logJobPostAnalytics(job: JobPostRecord, userId: string): Promise<void> {
  logger.info(
    {
      event: 'job_post_created',
      jobId: String(job._id),
      userId,
      title: job.title,
      status: job.status,
      featured: job.featured === true,
    },
    'Job post analytics event'
  );
}

export async function runJobPostSideEffects(
  job: JobPostRecord,
  userId: string,
  options: JobPostSideEffectOptions = {}
): Promise<void> {
  const jobId = String(job._id);
  const tasks = [
    (async () => {
      try {
        await convertDraftIfNeeded(jobId, userId, options.draftId);
        logger.info({ jobId, draftId: options.draftId }, 'Job draft conversion completed');
      } catch (error: unknown) {
        logger.error(
          { error, jobId, draftId: options.draftId },
          'Job draft conversion side effect failed'
        );
      }
    })(),
    (async () => {
      try {
        await updateUserAfterJobPost(userId, job);
        logger.info({ jobId, userId }, 'Job post user update completed');
      } catch (error: unknown) {
        logger.error({ error, jobId, userId }, 'Job post user update side effect failed');
      }
    })(),
    (async () => {
      try {
        const { notifyJobPosted } = await import('./jobs/jobNotifications');
        await notifyJobPosted(job);
      } catch (error: unknown) {
        logger.error({ error, jobId }, 'Job notifications side effect failed');
      }
    })(),
    (async () => {
      try {
        await invalidateJobPostCaches(userId);
        logger.info({ jobId, userId }, 'Job post user cache invalidation completed');
      } catch (error: unknown) {
        logger.error(
          { error, jobId, userId },
          'Job post user cache invalidation side effect failed'
        );
      }
    })(),
    (async () => {
      try {
        await logJobPostAnalytics(job, userId);
      } catch (error: unknown) {
        logger.error({ error, jobId, userId }, 'Job analytics side effect failed');
      }
    })(),
  ];

  await Promise.allSettled(tasks);
}
