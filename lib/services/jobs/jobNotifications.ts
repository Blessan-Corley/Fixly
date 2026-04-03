import { CHANNELS, EVENTS, getServerAbly } from '@/lib/ably';
import { logger } from '@/lib/logger';
import { redisUtils } from '@/lib/redis';
import { invalidateCache } from '@/lib/redisCache';
import User from '@/models/User';

import type { JobPostRecord } from './createJob';

function asString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    const stringValue = value.toString();
    return typeof stringValue === 'string' ? stringValue.trim() : '';
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function publishJobFeed(job: JobPostRecord): Promise<void> {
  const ably = getServerAbly();
  if (!ably) {
    logger.warn({ jobId: String(job._id) }, 'Ably unavailable for job post notifications');
    return;
  }

  const creatorId = asString(job.createdBy);
  const creator = creatorId
    ? await User.findById(creatorId).select('name rating').lean<{ name?: string; rating?: unknown } | null>()
    : null;

  const safeSkills = Array.isArray(job.skillsRequired)
    ? job.skillsRequired.map((skill) => asString(skill)).filter(Boolean)
    : [];
  const location = isRecord(job.location) ? job.location : {};
  const city = asString(location.city);
  const state = asString(location.state);
  const payload = {
    jobId: String(job._id),
    title: job.title,
    skillsRequired: safeSkills,
    location: job.location,
    budget: job.budget,
    urgency: job.urgency,
    createdBy: creatorId
      ? {
          id: creatorId,
          name: creator?.name || '',
          rating: creator?.rating,
        }
      : undefined,
    timestamp: new Date().toISOString(),
  };

  await ably.channels.get(CHANNELS.newJobs).publish(EVENTS.JOB_POSTED, payload);

  await Promise.allSettled(
    safeSkills.map((skill) =>
      ably.channels.get(CHANNELS.skillJobs(skill)).publish(EVENTS.JOB_POSTED, payload)
    )
  );

  if (city && state) {
    await ably.channels.get(CHANNELS.locationJobs(city, state)).publish(EVENTS.JOB_POSTED, payload);
  }
}

async function refreshJobCaches(): Promise<void> {
  await Promise.allSettled([
    invalidateCache('/api/search/suggestions'),
    invalidateCache('/api/jobs/browse'),
    redisUtils.del('job_stats:real_time'),
  ]);
}

export async function notifyJobPosted(job: JobPostRecord): Promise<void> {
  const jobId = String(job._id);
  const tasks = [
    (async () => {
      try {
        await publishJobFeed(job);
        logger.info({ jobId }, 'Job post feed notification completed');
      } catch (error: unknown) {
        logger.error({ error, jobId }, 'Job post feed notification failed');
      }
    })(),
    (async () => {
      try {
        await refreshJobCaches();
        logger.info({ jobId }, 'Job post cache refresh completed');
      } catch (error: unknown) {
        logger.error({ error, jobId }, 'Job post cache refresh failed');
      }
    })(),
  ];

  await Promise.allSettled(tasks);
}
