import { Types } from 'mongoose';

import { badRequest, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAdminMetricsCache } from '@/lib/services/adminMetricsService';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  notifyUser,
  parseAction,
  parseJobIds,
  toIdString,
  toTrimmedString,
} from './admin-jobs.helpers';
import { AdminJobsActionSchema, type LeanJobRecord, type SessionShape } from './admin-jobs.types';

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const rateLimitResult = await rateLimit(request, 'admin_job_action', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const session = auth.session as SessionShape;
    if (!session.user?.id) return unauthorized();
    const adminUserId = session.user.id;

    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, AdminJobsActionSchema);
    if ('error' in parsedBody) return parsedBody.error;

    const action = parseAction(parsedBody.data.action);
    const rawIds =
      parsedBody.data.jobIds ??
      (parsedBody.data.jobId ? [parsedBody.data.jobId] : undefined);
    const jobIds = parseJobIds(rawIds);
    const reason = (toTrimmedString(parsedBody.data.reason) ?? '').slice(0, 500);

    if (!action || !jobIds) return badRequest('Valid action and job IDs are required');

    await connectDB();

    let updateQuery: Record<string, unknown> = {};
    let successMessage = '';

    if (action === 'cancel') {
      updateQuery = {
        status: 'cancelled',
        'cancellation.cancelled': true,
        'cancellation.cancelledBy': adminUserId,
        'cancellation.reason': reason || 'Cancelled by admin',
        'cancellation.cancelledAt': new Date(),
      };
      successMessage = 'Jobs cancelled successfully';
    } else if (action === 'feature') {
      updateQuery = {
        featured: true,
        featuredUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };
      successMessage = 'Jobs featured successfully';
    } else if (action === 'unfeature') {
      updateQuery = { featured: false, $unset: { featuredUntil: 1 } };
      successMessage = 'Jobs unfeatured successfully';
    } else if (action === 'resolve_dispute') {
      updateQuery = {
        status: 'completed',
        'dispute.status': 'resolved',
        'dispute.resolvedBy': adminUserId,
        'dispute.resolution': reason || 'Resolved by admin',
        'dispute.resolvedAt': new Date(),
      };
      successMessage = 'Disputes resolved successfully';
    }

    const result = await Job.updateMany({ _id: { $in: jobIds } }, updateQuery);

    if (action === 'cancel') {
      const jobs = (await Job.find({ _id: { $in: jobIds } })
        .select('title createdBy assignedTo')
        .lean()) as LeanJobRecord[];

      const recipientIds = Array.from(
        new Set(
          jobs
            .flatMap((job) => [toIdString(job.createdBy), toIdString(job.assignedTo)])
            .filter((value): value is string => Boolean(value && Types.ObjectId.isValid(value)))
        )
      );
      const users = await User.find({ _id: { $in: recipientIds } })
        .select('notifications')
        .lean(false);
      const userMap = new Map(
        users.map((user) => [String(user._id), user as unknown as Record<string, unknown>])
      );

      const notifications: Array<Promise<void>> = [];
      for (const job of jobs) {
        const title = toTrimmedString(job.title) ?? 'Untitled Job';
        const hirerId = toIdString(job.createdBy);
        const fixerId = toIdString(job.assignedTo);
        const reasonSuffix = reason ? ` ${reason}` : '';

        if (hirerId) {
          notifications.push(
            notifyUser(
              userMap.get(hirerId) ?? null,
              'job_cancelled',
              'Job Cancelled by Admin',
              `Your job "${title}" has been cancelled by administration.${reasonSuffix}`
            )
          );
        }
        if (fixerId) {
          notifications.push(
            notifyUser(
              userMap.get(fixerId) ?? null,
              'job_cancelled',
              'Job Cancelled',
              `The job "${title}" has been cancelled by administration.${reasonSuffix}`
            )
          );
        }
      }
      await Promise.allSettled(notifications);
    }

    await invalidateAdminMetricsCache();

    return respond({
      success: true,
      message: successMessage,
      affectedJobs: result.modifiedCount,
      matchedJobs: result.matchedCount,
    });
  } catch (error: unknown) {
    logger.error('Admin job action error:', error);
    return serverError('Failed to perform action');
  }
}
