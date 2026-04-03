import { z } from 'zod';

import { parseBody, requireSession, respond, unauthorized } from '@/lib/api';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { csrfGuard } from '@/lib/security/csrf';
import { verifyAndApplyEmailChangeForUser } from '@/services/auth/emailChangeService';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const UpdateEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4),
  currentEmail: z.string().email(),
});

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function PUT(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'update_email', 5, 60 * 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          { message: 'Email update is temporarily unavailable. Please try again shortly.' },
          503
        );
      }

      return respond(
        { message: 'Too many email update attempts. Please try again later.' },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;
    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsed = await parseBody(request, UpdateEmailSchema);
    if ('error' in parsed) return parsed.error;
    const { email, otp, currentEmail } = parsed.data;

    const result = await verifyAndApplyEmailChangeForUser({
      userId,
      rawNewEmail: email,
      rawOtp: otp,
      rawCurrentEmail: currentEmail,
    });

    return respond(
      {
        success: result.success,
        message: result.message,
        user: result.user,
      },
      result.status
    );
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('Update email error:', err);
    return respond(
      {
        message: 'Failed to update email',
        error: env.NODE_ENV === 'development' ? err.message : undefined,
      },
      500
    );
  }
}
