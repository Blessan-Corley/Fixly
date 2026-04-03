import { requireSession } from '@/lib/api/auth';
import { handleRouteError } from '@/lib/api/errors';
import { badRequest, ok, respond, tooManyRequests, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import { getDashboardStats } from '@/lib/services/dashboardStatsService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

type SessionShape = {
  user?: {
    id?: string;
    role?: string;
  };
};

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const rateLimitResult = await rateLimit(request, 'dashboard_stats', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return tooManyRequests('Too many requests. Please try again later.');
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return unauthorized();
    }

    const session = auth.session as SessionShape;
    const userId = toTrimmedString(session.user?.id);
    if (!userId) {
      return unauthorized();
    }

    if (userId.startsWith('temp_')) {
      return respond(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Session not properly established. Please complete signup.',
            details: { needsReauth: true, needsSignup: true },
          },
        },
        401
      );
    }

    const role = toTrimmedString(session.user?.role);
    if (!role) {
      return badRequest('User role not set. Please complete your profile.');
    }

    const stats = await getDashboardStats(userId, role);
    return ok(stats);
  } catch (error: unknown) {
    logger.error({ error }, 'Dashboard stats error');
    return handleRouteError(error);
  }
}
