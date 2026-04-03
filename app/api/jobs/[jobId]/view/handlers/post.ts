import { notFound, requireSession, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { rateLimit } from '@/utils/rateLimiting';

import { publishJobCountsUpdate } from '../../realtime';
import { getValidatedJobId, type JobRouteContext } from '../../route.shared';

import {
  getClientIpAddress,
  isTransactionUnsupportedError,
  trackJobViewAtomically,
  trackJobViewWithoutTransaction,
} from './view.helpers';

export async function POST(request: Request, segmentData: JobRouteContext): Promise<Response> {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'job_view', 300, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = typeof auth.session.user.id === 'string' ? auth.session.user.id : '';
    if (!userId) return unauthorized();

    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const jobIdResult = getValidatedJobId(params, 'message');
    if (!jobIdResult.ok) return jobIdResult.response;
    const { jobId } = jobIdResult;

    await connectDB();

    const now = new Date();
    const ipAddress = getClientIpAddress(request);
    const userAgent = request.headers.get('user-agent') || '';

    let viewResult;
    try {
      viewResult = await trackJobViewAtomically(jobId, userId, ipAddress, userAgent, now);
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) throw error;
      logger.warn('Falling back to non-transactional view tracking:', error);
      viewResult = await trackJobViewWithoutTransaction(
        jobId,
        userId,
        ipAddress,
        userAgent,
        now
      );
    }

    if (!viewResult) return notFound('Job');

    if (viewResult.viewTracked) {
      await publishJobCountsUpdate(jobId, {
        type: 'view_count',
        applicationCount: viewResult.applicationCount,
        commentCount: viewResult.commentCount,
        viewCount: viewResult.viewCount,
      });
    }

    return respond({
      success: true,
      viewCount: viewResult.viewCount,
      viewTracked: viewResult.viewTracked,
      message: 'View tracked successfully',
    });
  } catch (error: unknown) {
    logger.error('Track view error:', error);
    return serverError('Failed to track view');
  }
}
