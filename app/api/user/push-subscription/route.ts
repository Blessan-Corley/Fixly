// Phase 2: Simplified push subscription parsing and aligned CSRF handling with session tokens.
import { z } from 'zod';

import {
  apiError,
  apiSuccess,
  apiValidationError,
  noContent,
  requireSession,
  unauthorized,
} from '@/lib/api';
import { NotFoundError, handleRouteError } from '@/lib/api/errors';
import { parseBody } from '@/lib/api/parse';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { csrfGuard } from '@/lib/security/csrf';
import { PushSubscriptionSchema } from '@/lib/validations/push';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

type UserPushSubscriptionRecord = {
  pushSubscription?: PushSubscriptionPayload | null;
};

type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: unknown;
  expirationTime?: unknown;
};

const PushSubscriptionRequestSchema = z.object({
  subscription: z.unknown().optional(),
  endpoint: z.unknown().optional(),
  keys: z.unknown().optional(),
  expirationTime: z.unknown().optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimitResult = await rateLimit(request, 'push_subscription', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return apiError('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
    }

    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    const parsedBody = await parseBody(request, PushSubscriptionRequestSchema);
    if ('error' in parsedBody) {
      return apiValidationError('Request body required');
    }
    const body = parsedBody.data;

    const payload =
      body && typeof body === 'object' && 'subscription' in body
        ? (body as { subscription?: unknown }).subscription
        : body;
    const parsed = PushSubscriptionSchema.safeParse(payload);
    if (!parsed.success) return apiValidationError(parsed.error.flatten());

    const subscription = parsed.data;
    await connectDB();

    const user = await User.findByIdAndUpdate(
      userId,
      {
        pushSubscription: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          expirationTime: subscription.expirationTime ?? null,
          userAgent: request.headers.get('user-agent'),
          subscribedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return apiSuccess({ message: 'Push subscription saved successfully' });
  } catch (error: unknown) {
    logger.error({ error }, 'Push subscription error');
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();
    const csrfResult = csrfGuard(request, auth.session);
    if (csrfResult) return csrfResult;

    await connectDB();

    const user = await User.findByIdAndUpdate(
      userId,
      { $unset: { pushSubscription: 1 } },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return noContent();
  } catch (error: unknown) {
    logger.error({ error }, 'Remove push subscription error');
    return handleRouteError(error);
  }
}

export async function GET(): Promise<Response> {
  try {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const userId = auth.session.user.id;
    if (!userId) return unauthorized();

    await connectDB();

    const user = await User.findById(userId)
      .select('pushSubscription')
      .lean<UserPushSubscriptionRecord | null>();

    return apiSuccess({
      subscribed: Boolean(user?.pushSubscription),
      subscription: user?.pushSubscription || null,
      publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.WEB_PUSH_VAPID_PUBLIC_KEY || null,
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Get push subscription error');
    return handleRouteError(error);
  }
}
