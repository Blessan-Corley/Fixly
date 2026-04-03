// Phase 2: Replaced admin disputes stub route with real moderation handlers.
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdmin } from '@/lib/api/auth';
import { parseBody, parseQuery } from '@/lib/api/parse';
import { apiSuccess, buildPaginationMeta, Errors, tooManyRequests } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import {
  listAdminDisputes,
  updateAdminDisputeStatus,
} from '@/lib/services/admin-disputes';
import { rateLimit } from '@/utils/rateLimiting';

const disputeStatusSchema = z.enum([
  'pending',
  'under_review',
  'awaiting_response',
  'in_mediation',
  'resolved',
  'escalated',
  'closed',
  'cancelled',
]);

const adminDisputesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: disputeStatusSchema.optional(),
});

const updateDisputeSchema = z.object({
  disputeId: z.string().min(1, 'Dispute ID is required'),
  status: disputeStatusSchema,
  moderatorNotes: z.string().trim().max(2000).optional(),
  assignedModerator: z.string().trim().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const parsedQuery = parseQuery(req, adminDisputesQuerySchema);
  if ('error' in parsedQuery) {
    return Errors.validation({ query: ['Invalid dispute query parameters'] });
  }

  try {
    const { page, limit, status } = parsedQuery.data;
    const { items, total } = await listAdminDisputes({ page, limit, status });
    return apiSuccess(items, {
      meta: buildPaginationMeta(total, page, limit),
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/admin/disputes]');
    return Errors.internal('Failed to fetch admin disputes');
  }
}

export async function PATCH(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, 'admin_disputes', 60, 60 * 1000);
  if (!rateLimitResult.success) {
    return tooManyRequests('Too many requests. Please try again later.');
  }

  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const adminUserId = auth.session.user.id;
  if (!adminUserId) {
    return Errors.unauthorized();
  }

  const csrfResult = csrfGuard(req, auth.session);
  if (csrfResult) return csrfResult;

  const parsedBody = await parseBody(req, updateDisputeSchema);
  if ('error' in parsedBody) {
    return Errors.validation({
      disputeId: ['Dispute ID is required'],
      status: ['A valid dispute status is required'],
    });
  }

  try {
    const updatedDispute = await updateAdminDisputeStatus({
      ...parsedBody.data,
      adminUserId,
    });

    if (!updatedDispute) {
      return Errors.notFound('Dispute');
    }

    return apiSuccess(updatedDispute, {
      message: 'Dispute status updated successfully',
    });
  } catch (error: unknown) {
    logger.error({ error }, '[PATCH /api/admin/disputes]');
    return Errors.internal('Failed to update dispute');
  }
}
