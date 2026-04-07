// Phase 2: Updated job posting mutations to validate CSRF against the authenticated session.
import { after } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { Channels, Events } from '@/lib/ably/events';
import { publishToChannel } from '@/lib/ably/publisher';
import {
  badRequest,
  created,
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  unauthorized,
} from '@/lib/api';
import { createStandardError, requirePermission } from '@/lib/authorization';
import { inngest } from '@/lib/inngest/client';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { invalidateCache } from '@/lib/redisCache';
import { csrfGuard } from '@/lib/security/csrf';
import { createJob } from '@/lib/services/jobs/createJob';
import {
  getJobPostingCooldownError,
  prepareJobPostPayload,
} from '@/lib/services/jobs/job.mutations';
import { parseCreateJobBody } from '@/lib/services/jobs/job.schema';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export { GET } from './handlers/get';

export const dynamic = 'force-dynamic';

const CreateJobRequestSchema = z.object({}).passthrough();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rateLimitResult = await rateLimit(request, 'job_posting');
    if (!rateLimitResult.success) {
      return respond(
        {
          success: false,
          message:
            rateLimitResult.message || 'Too many job posting requests. Please try again later.',
          remainingTime: rateLimitResult.remainingTime,
        },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const session = auth.session;
    const userId = typeof session.user.id === 'string' ? session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    try {
      requirePermission({ role: user.role }, 'create', 'job');
    } catch {
      return createStandardError(403, 'FORBIDDEN', 'Only hirers can post jobs');
    }

    if (user.banned) return respond({ message: 'Account suspended' }, 403);

    const cooldownError = getJobPostingCooldownError(user);
    if (cooldownError) return respond(cooldownError.body, cooldownError.status);

    const parsed = await parseBody(request, CreateJobRequestSchema);
    if ('error' in parsed) return parsed.error;

    const body = parseCreateJobBody(parsed.data);
    if (!body) return badRequest('Invalid request body');

    const preparedPayload = await prepareJobPostPayload(
      body,
      { _id: String(user._id), plan: user.plan },
      userId
    );
    if (preparedPayload.error) return respond(preparedPayload.error.body, preparedPayload.error.status);

    const job = await createJob(preparedPayload.jobData, String(user._id));
    const jobId = String(job._id);

    after(async () => {
      await Promise.allSettled([
        publishToChannel(Channels.marketplace, Events.marketplace.jobPosted, {
          jobId,
          title: job.title,
          category:
            typeof preparedPayload.jobData.category === 'string'
              ? preparedPayload.jobData.category
              : undefined,
          location: job.location,
          postedAt: job.createdAt,
        }),
        inngest.send({
          name: 'job/posted',
          data: {
            jobId,
            hirerId: session.user.id,
            hirerEmail: session.user.email ?? '',
            hirerName: session.user.name ?? 'Hirer',
            title: job.title ?? 'Untitled job',
            category:
              typeof preparedPayload.jobData.category === 'string'
                ? preparedPayload.jobData.category
                : '',
            location:
              typeof job.location === 'object' &&
              job.location !== null &&
              'city' in (job.location as Record<string, unknown>) &&
              typeof (job.location as Record<string, unknown>).city === 'string'
                ? ((job.location as Record<string, unknown>).city as string)
                : '',
            draftId: preparedPayload.draftId || undefined,
          },
        }),
        invalidateCache('/api/jobs/browse'),
        invalidateCache('/api/jobs/search'),
        redisUtils.invalidatePattern(`hirer-jobs:v1:${userId}:*`),
      ]);
    });

    const response = created({ jobId, message: 'Job posted successfully' });
    response.headers.set('X-Job-ID', jobId);
    response.headers.set('X-Job-Status', String(job.status || 'open'));
    response.headers.set('X-Job-Featured', String(Boolean(job.featured)));
    return response;
  } catch (error: unknown) {
    logger.error({ error }, 'Job posting error');
    return serverError('Failed to post job. Please try again.');
  }
}
