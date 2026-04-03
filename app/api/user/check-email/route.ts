// Phase 2: Simplified email availability parsing to avoid brittle request re-wrapping.
import { z } from 'zod';

import { parseBody, requireSession, respond } from '@/lib/api';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';

const CheckEmailSchema = z.object({
  email: z.string().email(),
});

function asNormalizedEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'email_check', 20, 60 * 1000, {
      requireRedis: true,
    });
    if (!rateLimitResult.success) {
      if (rateLimitResult.degraded) {
        return respond(
          {
            available: false,
            message: 'Email check is temporarily unavailable. Please try again shortly.',
          },
          503
        );
      }
      return respond(
        { available: false, message: 'Too many email checks. Please try again later.' },
        429
      );
    }

    const auth = await requireSession();
    if ('error' in auth) {
      return auth.error;
    }

    const parsed = await parseBody(request, CheckEmailSchema);
    if ('error' in parsed) {
      return parsed.error;
    }
    const email = asNormalizedEmail(parsed.data.email);

    await connectDB();

    const existingUser = await User.findOne({
      email,
      _id: { $ne: auth.session.user.id },
    })
      .select('_id')
      .lean();

    if (existingUser) {
      return respond(
        { available: false, message: 'Email is already registered' },
        200
      );
    }

    return respond({ available: true, message: 'Email is available' }, 200);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Check email error:', err);
    return respond(
      { available: false, message: 'Failed to check email availability' },
      500
    );
  }
}
