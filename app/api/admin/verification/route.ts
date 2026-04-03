// Phase 2: Updated admin verification mutations to validate CSRF against the authenticated session.
import { Types } from 'mongoose';
import { z } from 'zod';

import { badRequest, notFound, respond, serverError, tooManyRequests, unauthorized } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { parseBody } from '@/lib/api/parse';
import { invalidateAuthCache } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { invalidateAdminMetricsCache } from '@/lib/services/adminMetricsService';
import User from '@/models/User';
import type { IUser, VerificationStatus } from '@/types/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type SessionUser = {
  id?: string;
  role?: string;
};

const VerificationActionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

type UserDocument = IUser & {
  _id: Types.ObjectId;
  addNotification?: (
    type: string,
    title: string,
    message: string,
    data?: unknown
  ) => Promise<IUser>;
  save: () => Promise<unknown>;
};

const VALID_VERIFICATION_STATUSES = new Set<VerificationStatus>([
  'none',
  'pending',
  'approved',
  'rejected',
]);
const VALID_ACTIONS = new Set(['approve', 'reject']);
const MAX_PAGINATION_LIMIT = 50;
const MAX_REJECTION_REASON_LENGTH = 500;

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function parseError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('Unknown error');
}

function parsePageParam(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function parseLimitParam(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return Math.min(parsed, MAX_PAGINATION_LIMIT);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const statusParam = toTrimmedString(searchParams.get('status'))?.toLowerCase();
    const status: VerificationStatus = VALID_VERIFICATION_STATUSES.has(
      statusParam as VerificationStatus
    )
      ? (statusParam as VerificationStatus)
      : 'pending';

    const page = parsePageParam(searchParams.get('page'), 1);
    const limit = parseLimitParam(searchParams.get('limit'), 10);
    const skip = (page - 1) * limit;

    const filter = { 'verification.status': status };

    const applications = (await User.find(filter)
      .select('name email phone verification createdAt')
      .sort({ 'verification.submittedAt': -1 })
      .skip(skip)
      .limit(limit)) as UserDocument[];

    const total = await User.countDocuments(filter);

    const transformedApplications = applications
      .filter((user) => Boolean(user.verification))
      .map((user) => ({
        id: user._id,
        applicationId: user.verification?.applicationId,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        documentType: user.verification?.documentType,
        status: user.verification?.status,
        submittedAt: user.verification?.submittedAt,
        additionalInfo: user.verification?.additionalInfo,
        documents: user.verification?.documents,
        rejectionReason: user.verification?.rejectionReason,
        reviewedAt: user.verification?.reviewedAt,
        reviewedBy: user.verification?.reviewedBy,
      }));

    return respond({
      success: true,
      applications: transformedApplications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Get verification applications error:', err);
    return serverError('Failed to fetch verification applications');
  }
}

export async function PUT(request: Request) {
  const rateLimitResult = await rateLimit(request, 'admin_verification', 60, 60 * 1000);
  if (!rateLimitResult.success) {
    return tooManyRequests('Too many requests. Please try again later.');
  }

  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const session = auth.session as { user?: SessionUser };
    if (!session.user?.id) {
      return unauthorized();
    }
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    await connectDB();

    const parsed = await parseBody(request, VerificationActionSchema);
    if ('error' in parsed) {
      return parsed.error;
    }

    const userId = parsed.data.userId;
    const action = parsed.data.action;
    const rejectionReason = toTrimmedString(parsed.data.rejectionReason);

    if (!VALID_ACTIONS.has(action)) {
      return badRequest('Valid user ID and action (approve/reject) are required');
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return badRequest('Rejection reason is required when rejecting');
      }

      if (rejectionReason.length > MAX_REJECTION_REASON_LENGTH) {
        return badRequest(
          `Rejection reason cannot exceed ${MAX_REJECTION_REASON_LENGTH} characters`
        );
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

    return respond({
      success: true,
      message: `Verification ${action}ed successfully`,
      status: user.verification.status,
    });
  } catch (error: unknown) {
    const err = parseError(error);
    logger.error('Update verification status error:', err);
    return serverError('Failed to update verification status');
  }
}
