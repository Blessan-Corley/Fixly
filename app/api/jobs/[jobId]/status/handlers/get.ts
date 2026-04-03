import { requireSession } from '@/lib/api/auth';
import { forbidden, notFound, respond, serverError, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';

import { toIdString } from '../../job-route-utils';
import {
  CACHE_HEADERS,
  getValidatedJobId,
  type JobRouteContext,
  withCacheControl,
} from '../../route.shared';
import { buildStatusHistory, getAvailableActions } from '../status-helpers';

export async function handleGet(
  _request: Request,
  segmentData: JobRouteContext
): Promise<Response> {
  const params = await segmentData.params;
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const { session } = auth;
    const userId = session.user.id;
    if (!userId) return unauthorized();

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const { jobId } = jobIdResult;

    await connectDB();

    const currentUser = await User.findById(userId).select('role');
    if (!currentUser) {
      return notFound('User');
    }

    const job = await Job.findById(jobId)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .select(
        'status progress completion dispute cancellation assignedTo createdBy createdAt updatedAt'
      );

    if (!job) {
      return notFound('Job');
    }

    const isAdmin = currentUser.role === 'admin';
    const isJobCreator = toIdString(job.createdBy) === toIdString(currentUser._id);
    const isAssignedFixer =
      !!job.assignedTo && toIdString(job.assignedTo) === toIdString(currentUser._id);

    if (!isAdmin && !isJobCreator && !isAssignedFixer) {
      return forbidden('Access denied');
    }

    const statusHistory = buildStatusHistory(job);
    const lastStatusUpdate = statusHistory.length
      ? statusHistory[statusHistory.length - 1].changedAt
      : job.updatedAt;

    const availableActions = getAvailableActions(job, isJobCreator, isAssignedFixer, isAdmin);

    const response = respond({
      success: true,
      status: job.status,
      statusHistory,
      lastStatusUpdate,
      availableActions,
      assignedTo: job.assignedTo,
    });
    return withCacheControl(response, CACHE_HEADERS.PRIVATE_NO_STORE);
  } catch (error) {
    logger.error('Get job status error:', error);
    return serverError('Failed to get job status');
  }
}
