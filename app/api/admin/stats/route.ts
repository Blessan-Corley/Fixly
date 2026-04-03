import type { NextRequest } from 'next/server';

import { ok, serverError, tooManyRequests } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import { getAdminMetrics } from '@/lib/services/adminMetricsService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  const rateLimitResult = await rateLimit(request, 'admin_stats', 40, 60 * 1000);
  if (!rateLimitResult.success) {
    return tooManyRequests('Too many requests. Please try again later.');
  }

  try {
    const metrics = await getAdminMetrics();

    return ok({
      totalUsers: metrics.users.total,
      totalJobs: metrics.jobs.total,
      totalDisputes: metrics.disputes.total,
      activeJobs: metrics.jobs.active,
      completedJobs: metrics.jobs.completed,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/admin/stats]');
    return serverError();
  }
}
