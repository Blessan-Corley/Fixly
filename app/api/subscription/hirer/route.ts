import { NextRequest } from 'next/server';

import { requireRole } from '@/lib/api/auth';
import { forbidden, notFound, ok, serverError, unauthorized } from '@/lib/api/response';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import { redisUtils } from '@/lib/redis';
import { getHirerSubscriptionStatus } from '@/lib/services/billing/subscriptionStatus';
import User from '@/models/User';
import type { IUser } from '@/types/User';

export const dynamic = 'force-dynamic';

const CACHE_TTL_SECONDS = 60;

type HirerSubscriptionResponse = ReturnType<typeof getHirerSubscriptionStatus>;

function getCacheKey(userId: string): string {
  return `subscription:hirer:${userId}`;
}

function canAccessHirerSubscription(user: Pick<IUser, 'role' | 'banned' | 'isActive' | 'deletedAt'>): boolean {
  return (
    user.role === 'hirer' &&
    user.banned !== true &&
    user.isActive !== false &&
    !Boolean(user.deletedAt)
  );
}

export async function GET(_request: NextRequest): Promise<Response> {
  const auth = await requireRole('hirer');
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const userId = auth.session.user.id;
    if (!userId) {
      return unauthorized();
    }
    const cacheKey = getCacheKey(userId);
    const cached = await redisUtils.get<HirerSubscriptionResponse>(cacheKey);
    if (cached) {
      return ok(cached);
    }

    await connectDB();

    const user = (await User.findById(userId).lean()) as IUser | null;
    if (!user) {
      return notFound('User');
    }

    if (!canAccessHirerSubscription(user)) {
      return forbidden('Only active hirers can access hirer subscription status');
    }

    const response = getHirerSubscriptionStatus(user);
    await redisUtils.set(cacheKey, response, CACHE_TTL_SECONDS);

    return ok(response);
  } catch (error: unknown) {
    logger.error({ error }, '[GET /api/subscription/hirer]');
    return serverError();
  }
}
