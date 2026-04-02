import { badRequest, notFound, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAdminMetricsCache } from '@/lib/services/adminMetricsService';
import User from '@/models/User';
import type { VerificationStatus } from '@/types/User';
import { rateLimit } from '@/utils/rateLimiting';

import {
  MAX_REJECTION_REASON_LENGTH,
  VALID_ACTIONS,
  VALID_VERIFICATION_STATUSES,
  VerificationActionSchema,
  parseError,
  parseLimitParam,
  parsePageParam,
  toTrimmedString,
  transformApplication,
  type SessionUser,
  type UserDocument,
} from './helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const statusParam = toTrimmedString(searchParams.get('status'))?.toLowerCase();
    const status: VerificationStatus = VALID_VERIFICATION_STATUSES.has(statusParam as VerificationStatus)
      ? (statusParam as VerificationStatus)
      : 'pending';

    const page = parsePageParam(searchParams.get('page'), 1);
    const limit = parseLimitParam(searchParams.get('limit'), 10);
    const filter = { 'verification.status': status };

    const [applications, total] = await Promise.all([
      User.find(filter)
        .select('name email phone verification createdAt')
        .sort({ 'verification.submittedAt': -1 })
        .skip((page - 1) * limit)
        .limit(limit) as Promise<UserDocument[]>,
      User.countDocuments(filter),
    ]);

    return respond({
      success: true,
      applications: applications.filter((u) => Boolean(u.verification)).map(transformApplication),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    logger.error('Get verification applications error:', parseError(error));
    return serverError('Failed to fetch verification applications');
  }
}

export async function PUT(request: Request) {
  const rateLimitResult = await rateLimit(request, 'admin_verification', 60, 60 * 1000);
  if (!rateLimitResult.success) return tooManyRequests('Too many requests. Please try again later.');

  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const session = auth.session as { user?: SessionUser };
    if (!session.user?.id) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    await connectDB();

    const parsed = await parseBody(request, VerificationActionSchema);
    if ('error' in parsed) return parsed.error;

    const { userId, action } = parsed.data;
    const rejectionReason = toTrimmedString(parsed.data.rejectionReason);

    if (!VALID_ACTIONS.has(action)) return badRequest('Valid user ID and action (approve/reject) are required');
    if (action === 'reject') {
      if (!rejectionReason) return badRequest('Rejection reason is required when rejecting');
      if (rejectionReason.length > MAX_REJECTION_REASON_LENGTH) {
        return badRequest(`Rejection reason cannot exceed ${MAX_REJECTION_REASON_LENGTH} characters`);
      }
    }

    const user = (await User.findById(userId)) as UserDocument | null;
    if (!user || !user.verification || user.verification.status !== 'pending') {
      return notFound('Valid pending verification application');
    }

    if (action === 'approve') {
      user.isVerified = true;
      user.verification.status = 'approved';
      user.verification.reviewedAt = new Date();
      user.verification.reviewedBy = session.user.id;
      try {
        await user.addNotification?.(
          'verification_approved',
          'Account Verified Successfully!',
          'Congratulations! Your account has been verified. You now have access to enhanced features and increased visibility.'
        );
      } catch (notificationError: unknown) {
        logger.warn('Verification approval notification failed:', notificationError);
      }
    }

    if (action === 'reject') {
      user.verification.status = 'rejected';
      user.verification.rejectionReason = rejectionReason as string;
      user.verification.reviewedAt = new Date();
      user.verification.reviewedBy = session.user.id;
      try {
        await user.addNotification?.(
          'verification_rejected',
          'Verification Application Rejected',
          `Your verification application has been rejected. Reason: ${rejectionReason}. You can submit a new application after 7 days.`
        );
      } catch (notificationError: unknown) {
        logger.warn('Verification rejection notification failed:', notificationError);
      }
    }

    await user.save();
    await invalidateAuthCache(String(user._id));
    await invalidateAdminMetricsCache();

    return respond({ success: true, message: `Verification ${action}ed successfully`, status: user.verification.status });
  } catch (error: unknown) {
    logger.error('Update verification status error:', parseError(error));
    return serverError('Failed to update verification status');
  }
}
