import {
  forbidden,
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

import {
  ALLOWED_SORT_FIELDS,
  ALLOWED_STATUSES,
  escapeRegex,
  parsePositiveInt,
  type SessionUser,
} from './shared';

export async function handleGetDisputes(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'disputes', 100, 60 * 1000);
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = (searchParams.get('search') ?? '').trim();
    const page = parsePositiveInt(searchParams.get('page'), 1, 1, 10000);
    const limit = parsePositiveInt(searchParams.get('limit'), 10, 1, 50);
    const sortByParam = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sortBy = ALLOWED_SORT_FIELDS.has(sortByParam) ? sortByParam : 'createdAt';

    const filters: Record<string, unknown>[] = [];
    if (!can(currentUser, 'moderate', 'dispute')) {
      filters.push({ $or: [{ initiatedBy: userId }, { againstUser: userId }] });
    }
    if (status && ALLOWED_STATUSES.has(status)) filters.push({ status });
    if (category) filters.push({ category });
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filters.push({ $or: [{ disputeId: regex }, { title: regex }, { description: regex }] });
    }

    const query = filters.length > 0 ? { $and: filters } : {};
    const skip = (page - 1) * limit;

    const disputes = await Dispute.find(query)
      .populate('job', 'title category budget status')
      .populate('initiatedBy', 'name username email photoURL role')
      .populate('againstUser', 'name username email photoURL role')
      .populate('assignedModerator', 'name username email role')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalDisputes = await Dispute.countDocuments(query);
    const statistics = can(currentUser, 'moderate', 'dispute')
      ? await Dispute.getStatistics()
      : null;

    return respond({
      success: true,
      disputes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalDisputes / limit),
        totalDisputes,
        hasMore: skip + disputes.length < totalDisputes,
      },
      statistics,
    });
  } catch (error) {
    logger.error('Get disputes error:', error);
    return serverError('Failed to fetch disputes');
  }
}
