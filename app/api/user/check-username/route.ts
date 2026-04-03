// Phase 2: Simplified username availability parsing to avoid brittle request re-wrapping.
import { z } from 'zod';

import { badRequest, parseBody, requireSession, respond } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { normalizeUsername, validateUsernameFormat } from '@/lib/validations/username';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const CheckUsernameSchema = z.object({
  username: z.string(),
});

function asUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'username_check', 20, 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          {
            success: false,
            available: false,
            message: 'Username check is temporarily unavailable. Please try again shortly.',
          },
          503
        );
      }

      return respond(
        {
          success: false,
          available: false,
          message: 'Too many username checks. Please try again later.',
          remainingTime: rateLimitResult.remainingTime,
        },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }

    const parsed = await parseBody(request, CheckUsernameSchema);
    if ('error' in parsed) {
      return badRequest('Invalid request body');
    }

    const username = normalizeUsername(asUsername(parsed.data.username));
    const validationError = validateUsernameFormat(username);
    if (validationError) {
      return respond(
        { success: false, available: false, message: validationError },
        400
      );
    }

    const { ContentValidator } = await import('@/lib/validations/content');
    const contentValidation = await ContentValidator.validateUsername(
      username,
      auth.session.user.id || null
    );
    if (!contentValidation.isValid) {
      return respond(
        {
          success: false,
          available: false,
          message: contentValidation.violations[0]?.message || 'Invalid username',
          suggestions: contentValidation.suggestions,
        },
        400
      );
    }

    await connectDB();

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: auth.session.user.id },
    })
      .select('_id')
      .lean();

    if (existingUser) {
      return respond(
        {
          success: true,
          available: false,
          message: 'Username is already taken',
        },
        200
      );
    }

    return respond(
      {
        success: true,
        available: true,
        message: 'Username is available',
      },
      200
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Check username error:', err);
    return respond(
      {
        success: false,
        available: false,
        message: 'Failed to check username availability',
      },
      500
    );
  }
}
