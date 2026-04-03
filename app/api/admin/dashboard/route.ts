import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { ok, parseQuery, serverError } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { logger } from '@/lib/logger';
import {
  getAdminMetrics,
  getAdminMetricsByTimeRange,
} from '@/lib/services/adminMetricsService';

export const dynamic = 'force-dynamic';

const adminDashboardQuerySchema = z.object({
  refresh: z.enum(['true', 'false']).optional(),
  range: z.enum(['7d', '30d', '90d']).optional(),
});

function parseRange(value: string | null): '7d' | '30d' | '90d' {
  if (value === '7d' || value === '30d' || value === '90d') {
    return value;
  }
  return '30d';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  const parsed = parseQuery(request, adminDashboardQuerySchema);
  if ('error' in parsed) {
    return parsed.error;
  }

  try {
    const { session } = auth;
    const refresh = parsed.data.refresh === 'true';
    const range = parseRange(parsed.data.range ?? null);

    const [metrics, timeSeries] = await Promise.all([
      getAdminMetrics(refresh),
      getAdminMetricsByTimeRange(range),
    ]);

    logger.info(
      {
        userId: session.user.id,
        refresh,
        range,
      },
      'Admin dashboard metrics requested'
    );

    return ok({
      ...metrics,
      timeSeries,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/admin/dashboard]');
    return serverError();
  }
}
