import { z } from 'zod';

import { requireSession } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { UpdateJobSchema } from '@/lib/validations/job';
import Job from '@/models/Job';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { sanitizeString, toIdString } from '../job-route-utils';
import {
  acceptApplication,
  cancelJob,
  confirmJobCompletion,
  confirmJobProgress,
  markFixerArrived,
  markJobCompleted,
  markJobInProgress,
  rejectApplication,
  updateJobDetails,
  type ActionUserLike,
  type JobDocumentLike,
} from '../route-actions';
import { getValidatedJobId, type JobRouteContext } from '../route.shared';

type JobAction =
  | 'accept_application'
  | 'reject_application'
  | 'cancel_job'
  | 'mark_completed'
  | 'update_details'
  | 'mark_in_progress'
  | 'confirm_progress'
  | 'confirm_completion'
  | 'mark_arrived';

type JobUpdateBody = {
  action?: JobAction;
  data?: Record<string, unknown>;
};

const jobUpdateSchema = z.object({
  action: z.enum([
    'accept_application',
    'reject_application',
    'cancel_job',
    'mark_completed',
    'update_details',
    'mark_in_progress',
    'confirm_progress',
    'confirm_completion',
    'mark_arrived',
  ]),
  data: z.record(z.string(), z.unknown()).optional(),
});

const CREATOR_ACTIONS = new Set<JobAction>([
  'accept_application',
  'reject_application',
  'cancel_job',
  'update_details',
  'confirm_progress',
  'confirm_completion',
]);

const FIXER_ACTIONS = new Set<JobAction>(['mark_completed', 'mark_in_progress', 'mark_arrived']);

function parseAction(value: unknown): JobAction | null {
  if (typeof value !== 'string') return null;
  const action = value as JobAction;
  if (CREATOR_ACTIONS.has(action) || FIXER_ACTIONS.has(action)) return action;
  return null;
}

function canPerformAction(
  action: JobAction,
  isAdmin: boolean,
  isJobCreator: boolean,
  isAssignedFixer: boolean
): boolean {
  if (isAdmin) return true;
  if (CREATOR_ACTIONS.has(action)) return isJobCreator;
  if (FIXER_ACTIONS.has(action)) return isAssignedFixer;
  return false;
}

export async function PUT(request: Request, segmentData: JobRouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_update', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many update requests. Please try again later.');
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

    const parsed = await parseBody(request, jobUpdateSchema);
    if ('error' in parsed) return parsed.error;
    const body: JobUpdateBody = parsed.data;

    const action = parseAction(body.action);
    if (!action) return badRequest('Invalid action');

    const data = body.data && typeof body.data === 'object' ? body.data : {};
    if (action === 'update_details') {
      const parsedUpdate = UpdateJobSchema.safeParse(data);
      if (!parsedUpdate.success) {
        return badRequest('Validation failed', parsedUpdate.error.flatten());
      }
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) return notFound('User');

    const job = await Job.findById(jobId);
    if (!job) return notFound('Job');

    const isAdmin = user.role === 'admin';
    const isJobCreator = toIdString(job.createdBy) === toIdString(user._id);
    const isAssignedFixer = !!job.assignedTo && toIdString(job.assignedTo) === toIdString(user._id);

    if (!canPerformAction(action, isAdmin, isJobCreator, isAssignedFixer)) {
      return forbidden('Permission denied for this action');
    }

    const mutableJob = job as unknown as JobDocumentLike;
    const actingUser = user as unknown as ActionUserLike;

    switch (action) {
      case 'accept_application':
        return acceptApplication(mutableJob, String(data.applicationId ?? ''));
      case 'reject_application':
        return rejectApplication(mutableJob, String(data.applicationId ?? ''));
      case 'cancel_job':
        return cancelJob(mutableJob, sanitizeString(data.reason));
      case 'mark_completed':
        return markJobCompleted(mutableJob, actingUser, data, isAdmin);
      case 'update_details':
        return updateJobDetails(mutableJob, data);
      case 'mark_in_progress':
        return markJobInProgress(mutableJob, actingUser, isAdmin);
      case 'confirm_progress':
        return confirmJobProgress(mutableJob, actingUser, isAdmin);
      case 'confirm_completion':
        return confirmJobCompletion(mutableJob, actingUser, data, isAdmin);
      case 'mark_arrived':
        return markFixerArrived(mutableJob, actingUser, isAdmin);
      default:
        return badRequest('Invalid action');
    }
  } catch (error) {
    logger.error('Update job error:', error);
    return serverError('Failed to update job');
  }
}
