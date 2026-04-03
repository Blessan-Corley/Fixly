import { after, NextRequest } from 'next/server';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import { requireSession } from '@/lib/api/auth';
import { badRequest, notFound, ok, serverError, tooManyRequests } from '@/lib/api/response';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

function toIdString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    const nextValue = value.toString();
    return nextValue === '[object Object]' ? '' : nextValue;
  }

  return '';
}

export async function PATCH(req: NextRequest, props: RouteContext) {
  const params = await props.params;

  const rateLimitResult = await rateLimit(req, 'job_complete', 10, 60 * 60 * 1000);
  if (!rateLimitResult.success) {
    return tooManyRequests('Too many requests. Please try again later.');
  }

  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  try {
    await connectDB();

    const job = await Job.findById(params.jobId);
    if (!job) {
      return notFound('Job');
    }

    if (toIdString(job.createdBy) !== String(auth.session.user.id)) {
      return badRequest('Only the hirer can mark this job as complete');
    }

    if (job.status !== 'in_progress') {
      return badRequest('Only in-progress jobs can be marked as complete');
    }

    const fixerId = toIdString(job.assignedTo);
    if (!fixerId) {
      return badRequest('This job does not have an assigned fixer');
    }

    const fixer = await User.findById(fixerId).select('name email');
    if (!fixer) {
      return notFound('Assigned fixer');
    }

    const completedAt = new Date();
    const previousStatus = typeof job.status === 'string' ? job.status : 'in_progress';
    const jobTitle = typeof job.title === 'string' ? job.title : 'Untitled job';
    const hirerName =
      typeof auth.session.user.name === 'string' && auth.session.user.name.trim().length > 0
        ? auth.session.user.name
        : 'The hirer';

    job.status = 'completed';
    job.progress = {
      ...(job.progress || {}),
      completedAt,
      confirmedAt: completedAt,
    };
    job.completion = {
      ...(job.completion || {}),
      confirmedAt: completedAt,
    };

    await job.save();

    const notificationId = `job:${params.jobId}:completed:${completedAt.getTime()}`;

    after(async () => {
      await Promise.allSettled([
        publishToChannel(Channels.job(params.jobId), Events.job.statusChanged, {
          jobId: params.jobId,
          previousStatus,
          newStatus: 'completed',
          changedBy: auth.session.user.id,
          changedAt: completedAt.toISOString(),
        }),
        publishToChannel(Channels.user(fixerId), Events.user.notificationSent, {
          notificationId,
          type: 'job_completed',
          title: 'Job marked as complete',
          message: `${hirerName} marked "${jobTitle}" as complete.`,
          link: `/jobs/${params.jobId}`,
          createdAt: completedAt.toISOString(),
        }),
        inngest.send({
          name: 'job/completed',
          data: {
            jobId: params.jobId,
            jobTitle,
            hirerId: String(auth.session.user.id),
            hirerEmail: typeof auth.session.user.email === 'string' ? auth.session.user.email : '',
            hirerName,
            fixerId,
            fixerEmail: typeof fixer.email === 'string' ? fixer.email : '',
            fixerName: typeof fixer.name === 'string' ? fixer.name : 'Fixer',
          },
        }),
        inngest.send({
          name: 'notification/send',
          data: {
            userId: fixerId,
            type: 'job_completed',
            title: 'Job marked as complete',
            message: `${hirerName} marked "${jobTitle}" as complete.`,
            link: `/jobs/${params.jobId}`,
          },
        }),
      ]);
    });

    return ok({
      success: true,
      job,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[PATCH /api/jobs/[jobId]/complete]');
    return serverError('Failed to complete job');
  }
}
