import {
  forbidden,
  notFound,
  requireSession,
  respond,
  serverError,
  tooManyRequests,
  unauthorized,
} from '@/lib/api';
import { can, requirePermission } from '@/lib/authorization';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Dispute from '@/models/Dispute';
import { rateLimit } from '@/utils/rateLimiting';

import { canAccessDispute, RouteContext, SessionUser } from './shared';

export async function GET(request: Request, segmentData: RouteContext) {
  const params = await segmentData.params;
  try {
    const rateLimitResult = await rateLimit(request, 'dispute_detail', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const currentUser: SessionUser = {
      id: userId,
      name: auth.session.user.name ?? undefined,
      role: typeof auth.session.user.role === 'string' ? auth.session.user.role : undefined,
    };
    try {
      requirePermission(currentUser, 'read', 'dispute');
    } catch {
      return forbidden('Insufficient permissions');
    }

    const { disputeId } = params;
    await connectDB();

    const dispute = await Dispute.findOne({ disputeId })
      .populate('job', 'title category budget status description location')
      .populate('initiatedBy', 'name username email photoURL role rating')
      .populate('againstUser', 'name username email photoURL role rating')
      .populate('assignedModerator', 'name username email role')
      .populate('messages.sender', 'name username photoURL role');

    if (!dispute) {
      return notFound('Dispute');
    }

    if (!canAccessDispute(dispute, currentUser)) {
      return forbidden('Access denied');
    }

    const viewedBy = dispute.metadata?.viewedBy || [];
    const alreadyViewed = viewedBy.some((entry) => String(entry?.user) === currentUser.id);

    if (!alreadyViewed) {
      await Dispute.updateOne(
        { disputeId },
        {
          $push: {
            'metadata.viewedBy': {
              user: currentUser.id,
              viewedAt: new Date(),
            },
          },
        }
      );
    }

    const disputeObject = dispute.toObject();
    if (!can(currentUser, 'moderate', 'dispute')) {
      disputeObject.messages = (disputeObject.messages || []).filter((message) => message.isPublic);
    }

    return respond({
      success: true,
      dispute: disputeObject,
    });
  } catch (error) {
    logger.error('Get dispute error:', error);
    return serverError('Failed to fetch dispute');
  }
}
