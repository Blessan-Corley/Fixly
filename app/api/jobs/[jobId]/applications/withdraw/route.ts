import {
  notFound,
  parseBody,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { WithdrawApplicationSchema } from '@/lib/validations/application';
import Job from '@/models/Job';
import { countActiveApplicationsOnJob, withdrawApplicationOnJob } from '@/models/job/workflow';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

import { invalidateJobReadCaches } from '../../job-route-utils';
import { publishJobCountsUpdate } from '../../realtime';
import { getValidatedJobId, type JobRouteContext } from '../../route.shared';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, props: JobRouteContext) {
  const params = await props.params;
  try {
    const rateLimitResult = await rateLimit(request, 'withdraw_application', 20, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const parsed = await parseBody(request, WithdrawApplicationSchema);
    if ('error' in parsed) return parsed.error;

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) {
      return jobIdResult.response;
    }
    const { jobId } = jobIdResult;

    await connectDB();

    const user = await User.findById(userId).select('role banned');
    if (!user) {
      return notFound('User');
    }

    if (user.banned) {
      return respond({ message: 'Account suspended' }, 403);
    }

    if (user.role !== 'fixer') {
      return respond(
        { message: 'Only fixers can withdraw applications' },
        403
      );
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return notFound('Job');
    }

    const withdrawResult = withdrawApplicationOnJob(job, String(user._id));
    if (!withdrawResult.ok) {
      return notFound('Pending application');
    }

    await job.save({ validateBeforeSave: false });
    await invalidateJobReadCaches(jobId);

    const applicationCount = countActiveApplicationsOnJob(job);

    await publishJobCountsUpdate(jobId, {
      applicationCount,
    });

    return respond({
      success: true,
      message: 'Application withdrawn successfully',
      applicationCount,
    });
  } catch (error: unknown) {
    logger.error('Withdraw application error:', error);
    return serverError('Failed to withdraw application');
  }
}
