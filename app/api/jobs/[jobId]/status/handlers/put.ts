import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  badRequest,
  forbidden,
  notFound,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { sendDisputeMessage, sendWorkStatusMessage } from '@/lib/services/automatedMessaging';
import { moderateUserGeneratedContent } from '@/lib/validations/content-policy';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  invalidateJobReadCaches,
  sanitizeString,
  toIdString,
} from '../../job-route-utils';
import { getValidatedJobId, type JobRouteContext } from '../../route.shared';
import {
  buildStatusHistory,
  parseStatus,
  publishJobStatusUpdate,
  STATUS_ROLE_PERMISSIONS,
  VALID_TRANSITIONS,
  type JobStatus,
} from '../status-helpers';

import {
  handleCancelledCase,
  handleCompletedCase,
  handleDisputedCase,
  handleInProgressCase,
} from './put.cases';
import { statusBodySchema, type JobDoc, type StatusTransitionContext, type UserDoc } from './put.types';

export async function handlePut(request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_status_update', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many status update requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    const parsed = await parseBody(request, statusBodySchema);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data;

    const newStatus = parseStatus(body.newStatus);
    if (!newStatus) return badRequest('Valid new status is required');

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (!currentUser) return notFound('User');

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('applications.fixer', 'name email role');

    if (!job) return notFound('Job');

    const previousStatus = job.status as JobStatus;
    const isAdmin = currentUser.role === 'admin';
    const isJobCreator = toIdString(job.createdBy) === toIdString(currentUser._id);
    const isAssignedFixer =
      !!job.assignedTo && toIdString(job.assignedTo) === toIdString(currentUser._id);

    if (!isAdmin && !isJobCreator && !isAssignedFixer) {
      return forbidden('You do not have permission to update this job status');
    }

    if (!VALID_TRANSITIONS[previousStatus]?.includes(newStatus)) {
      return badRequest(`Cannot change status from ${previousStatus} to ${newStatus}`);
    }

    if (!isAdmin) {
      const allowedRoles = STATUS_ROLE_PERMISSIONS[newStatus] ?? [];
      if (!allowedRoles.includes(currentUser.role as 'hirer' | 'fixer')) {
        return forbidden(`Your role cannot set status to ${newStatus}`);
      }
    }

    const now = new Date();
    const reason = sanitizeString(body.reason);
    const completionNotes = sanitizeString(body.completionNotes);
    const disputeReason = sanitizeString(body.disputeReason);
    const assignedFixerId = sanitizeString(body.assignedFixerId);

    for (const field of [
      { label: 'Status reason', value: reason },
      { label: 'Completion notes', value: completionNotes },
      { label: 'Dispute reason', value: disputeReason },
    ]) {
      if (!field.value) continue;
      const moderation = await moderateUserGeneratedContent(field.value, {
        context: 'dispute',
        fieldLabel: field.label,
        userId,
      });
      if (!moderation.allowed) {
        return respond(
          { message: moderation.message, violations: moderation.violations, suggestions: moderation.suggestions },
          400
        );
      }
    }

    const ctx: StatusTransitionContext = {
      job: job as unknown as JobDoc,
      currentUser: currentUser as unknown as UserDoc,
      isAdmin,
      isJobCreator,
      reason,
      completionNotes,
      disputeReason,
      assignedFixerId,
      now,
      userId,
      jobId,
    };

    let caseResult: Response | null = null;

    switch (newStatus) {
      case 'in_progress':
        caseResult = await handleInProgressCase(ctx);
        break;
      case 'completed':
        caseResult = await handleCompletedCase(ctx);
        break;
      case 'cancelled':
        caseResult = await handleCancelledCase(ctx);
        break;
      case 'disputed':
        caseResult = await handleDisputedCase(ctx);
        break;
      case 'expired':
        if (!isAdmin && !isJobCreator) return forbidden('Only the job creator can expire the job');
        job.status = 'expired';
        break;
      case 'open':
        if (!isAdmin && !isJobCreator) return forbidden('Only the job creator can reopen the job');
        job.status = 'open';
        break;
      default:
        return badRequest('Unsupported status transition');
    }

    if (caseResult) return caseResult;

    await job.save();
    await invalidateJobReadCaches(job._id);

    if (newStatus === 'completed' && previousStatus !== 'completed' && job.assignedTo) {
      await User.findByIdAndUpdate(job.assignedTo, {
        $inc: { jobsCompleted: 1, totalEarnings: job.budget?.amount ?? 0 },
      });
      await User.findByIdAndUpdate(job.createdBy, { $inc: { jobsPosted: 1 } });
    }

    const statusHistory = buildStatusHistory(job);
    const lastStatusUpdate = statusHistory.length
      ? statusHistory[statusHistory.length - 1].changedAt
      : job.updatedAt;

    await publishJobStatusUpdate(jobId, {
      jobId,
      previousStatus,
      newStatus,
      actorId: toIdString(currentUser._id),
      actorName: currentUser.name ?? 'System',
      reason: disputeReason ?? reason ?? completionNotes ?? null,
      assignedTo: job.assignedTo,
      timestamp: new Date().toISOString(),
    });

    try {
      if (newStatus === 'in_progress') await sendWorkStatusMessage(jobId, 'in_progress');
      if (newStatus === 'completed') await sendWorkStatusMessage(jobId, 'completed');
      if (newStatus === 'disputed') await sendDisputeMessage(jobId);
    } catch (messagingError: unknown) {
      logger.error('Failed to send job status system message:', messagingError);
    }

    return respond({
      success: true,
      message: `Job status updated to ${newStatus}`,
      job: { _id: job._id, status: job.status, assignedTo: job.assignedTo, lastStatusUpdate },
      statusHistory,
    });
  } catch (error) {
    logger.error('Job status update error:', error);
    return serverError('Failed to update job status');
  }
}
