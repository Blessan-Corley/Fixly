import { respond, tooManyRequests } from '@/lib/api';
import { requireAdmin } from '@/lib/api/auth';
import { env } from '@/lib/env';
import { envHealthCheck } from '@/lib/env-validation';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/utils/rateLimiting';

import {
  buildRuntimeChecks,
  computeHealthScore,
  generateRecommendations,
  getEnvVariableStatuses,
  type EnvHealthResult,
} from './env-health.helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const rateLimitResult = await rateLimit(request, 'admin_env_health', 20, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const healthCheck = envHealthCheck() as EnvHealthResult;
    const runtimeChecks = buildRuntimeChecks();
    const healthScore = computeHealthScore(runtimeChecks);
    const variables = getEnvVariableStatuses();

    return respond({
      success: true,
      health: {
        ...healthCheck,
        healthScore,
        runtimeChecks,
        variables,
        recommendations: generateRecommendations(runtimeChecks),
      },
    });
  } catch (error: unknown) {
    logger.error('Environment health check error:', error);
    return respond(
      {
        success: false,
        message: 'Environment health check failed',
        error: env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
      },
      500
    );
  }
}
